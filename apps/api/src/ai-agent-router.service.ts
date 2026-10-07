import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { AiAgentActivatedBy, AiAgentActivationMode, AiAgentGroupResponseMode, AiAgentScope, AiAgentSessionStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { agentNamespace } from './agent-namespace';
import { canonicalAgentTarget, matchesAgentKeyword } from './ai-agent-matcher';
import { AiAgentSessionsService } from './ai-agent-sessions.service';
import { FeatureFlagsService } from './feature-flags.service';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

type InboundAgentInput = {
  tenantId: string;
  instanceId: string;
  chatId: string;
  participantId?: string | null;
  text: string;
  inboundMessageId: string;
  mentioned?: boolean;
  repliedToAgent?: boolean;
};

@Injectable()
export class AiAgentRouterService {
  constructor(
    private readonly db: PrismaService,
    private readonly sessions: AiAgentSessionsService,
    private readonly redis: RedisService,
    private readonly messages: MessagesService,
    private readonly flags: FeatureFlagsService,
    @InjectQueue('ai-agent-execution') private readonly queue: Queue,
  ) {}

  async handleInbound(input: InboundAgentInput) {
    if (!this.flags.aiAgentV2) return null;
    const lockKey = agentNamespace.lock(input.tenantId, input.inboundMessageId);
    const token = await this.redis.acquireLock(lockKey, 60_000);
    if (!token) return { handled: true, duplicate: true };
    try {
      const existingExecution = await this.db.aiAgentExecution.findUnique({
        where: { tenantId_inboundMessageId: { tenantId: input.tenantId, inboundMessageId: input.inboundMessageId } },
      });
      if (existingExecution) return { handled: true, duplicate: true, executionId: existingExecution.id };

      const activeSession = await this.sessions.resolveActive(input.tenantId, input.instanceId, input.chatId, input.participantId);
      if (activeSession) {
        if (activeSession.status === AiAgentSessionStatus.PAUSED || activeSession.status === AiAgentSessionStatus.HANDED_OFF) {
          return {
            handled: true,
            action: activeSession.status === AiAgentSessionStatus.PAUSED ? 'session_paused' : 'human_handoff',
            sessionId: activeSession.id,
          };
        }
        if (matchesAgentKeyword(input.text, activeSession.agent.deactivationKeywords, activeSession.agent.deactivationMatchType)) {
          await this.sessions.close(activeSession.id);
          if (activeSession.agent.closingMessage) {
            await this.messages.sendText(this.systemUser(input.tenantId), input.instanceId, input.chatId, activeSession.agent.closingMessage);
          }
          const execution = await this.db.aiAgentExecution.create({
            data: {
              tenantId: input.tenantId, agentId: activeSession.agentId, sessionId: activeSession.id,
              instanceId: input.instanceId, chatId: input.chatId, inboundMessageId: input.inboundMessageId,
              status: 'SKIPPED', scopeDecision: { reason: 'deactivation_keyword' },
            },
          });
          return { handled: true, action: 'session_closed', executionId: execution.id };
        }
        await this.sessions.touch(activeSession, activeSession.agent.sessionTtlSeconds, activeSession.agent.extendSessionOnMessage);
        return this.queueExecution(input, activeSession.agent, activeSession.id, 'active_session');
      }

      const candidates = await this.db.aiAgent.findMany({
        where: {
          tenantId: input.tenantId,
          enabled: true,
          OR: [{ allInstances: true }, { instances: { some: { instanceId: input.instanceId } } }],
        },
        include: { targets: true, aiProvider: true },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });
      const matching = candidates
        .filter((agent) => this.scopeMatches(agent, input))
        .filter((agent) => this.groupModeMatches(agent, input))
        .sort((left, right) => this.scopeRank(left.scope) - this.scopeRank(right.scope) || left.priority - right.priority);
      const winner = matching.find((agent) => agent.activationMode === AiAgentActivationMode.ALWAYS
        || (agent.activationMode === AiAgentActivationMode.KEYWORD
          && matchesAgentKeyword(input.text, agent.activationKeywords, agent.activationMatchType)));
      if (!winner) return null;

      const scopeKey = winner.scope === AiAgentScope.GROUP && winner.groupMemoryMode === 'PER_MEMBER' && input.participantId
        ? `${input.chatId}:${input.participantId}`
        : input.chatId;
      const session = await this.sessions.activate({
        tenantId: input.tenantId,
        agentId: winner.id,
        instanceId: input.instanceId,
        chatId: input.chatId,
        participantId: winner.scope === AiAgentScope.GROUP && winner.groupMemoryMode === 'PER_MEMBER' ? input.participantId : null,
        scopeKey,
        activatedBy: winner.activationMode === AiAgentActivationMode.ALWAYS ? AiAgentActivatedBy.ALWAYS : AiAgentActivatedBy.KEYWORD,
        ttlSeconds: winner.sessionTtlSeconds,
      });
      if (winner.activationMode === AiAgentActivationMode.KEYWORD && winner.consumeActivationMessage) {
        if (winner.openingMessage) await this.messages.sendText(this.systemUser(input.tenantId), input.instanceId, input.chatId, winner.openingMessage);
        const execution = await this.db.aiAgentExecution.create({
          data: {
            tenantId: input.tenantId, agentId: winner.id, sessionId: session.id,
            instanceId: input.instanceId, chatId: input.chatId, inboundMessageId: input.inboundMessageId,
            status: 'SKIPPED', scopeDecision: { reason: 'activation_message_consumed', scope: winner.scope },
          },
        });
        return { handled: true, action: 'session_activated', executionId: execution.id };
      }
      return this.queueExecution(input, winner, session.id, 'agent_activated');
    } finally {
      await this.redis.releaseLock(lockKey, token).catch(() => undefined);
    }
  }

  private async queueExecution(input: InboundAgentInput, agent: any, sessionId: string, reason: string) {
    let execution;
    try {
      execution = await this.db.aiAgentExecution.create({
        data: {
          tenantId: input.tenantId, agentId: agent.id, sessionId, instanceId: input.instanceId,
          aiProviderId: agent.aiProviderId, chatId: input.chatId, inboundMessageId: input.inboundMessageId,
          status: 'QUEUED', model: agent.aiModel ?? agent.aiProvider.defaultModel,
          scopeDecision: { reason, scope: agent.scope, participantId: input.participantId ?? null },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return { handled: true, duplicate: true };
      throw error;
    }
    await this.queue.add('execute', { executionId: execution.id, text: input.text }, {
      jobId: execution.id, attempts: 3, backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 1000, removeOnFail: 5000,
    });
    return { handled: true, action: 'queued', executionId: execution.id, agentId: agent.id };
  }

  private scopeMatches(agent: any, input: InboundAgentInput) {
    if (agent.scope === AiAgentScope.GLOBAL) return true;
    const expected = canonicalAgentTarget(input.chatId);
    return agent.targets.some((target: any) => canonicalAgentTarget(target.targetKey) === expected
      && (!target.instanceId || target.instanceId === input.instanceId));
  }

  private groupModeMatches(agent: any, input: InboundAgentInput) {
    if (agent.scope !== AiAgentScope.GROUP) return !input.chatId.endsWith('@g.us');
    if (!input.chatId.endsWith('@g.us')) return false;
    if (agent.groupResponseMode === AiAgentGroupResponseMode.ALL) return true;
    if (agent.groupResponseMode === AiAgentGroupResponseMode.MENTION_ONLY) return Boolean(input.mentioned);
    if (agent.groupResponseMode === AiAgentGroupResponseMode.REPLY_ONLY) return Boolean(input.repliedToAgent);
    return matchesAgentKeyword(input.text, agent.activationKeywords, agent.activationMatchType);
  }

  private scopeRank(scope: AiAgentScope) {
    return scope === AiAgentScope.GROUP ? 0 : scope === AiAgentScope.CONTACT ? 1 : 2;
  }

  private systemUser(tenantId: string) {
    return { tenantId, userId: 'ai-agent', isSuperAdmin: false };
  }
}
