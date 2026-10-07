import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AiAgentActivationMode,
  AiAgentGroupMemoryMode,
  AiAgentGroupResponseMode,
  AiAgentMatchType,
  AiAgentScope,
  AiAgentTargetType,
  Prisma,
} from '@prisma/client';
import { AiProvidersService } from './ai-providers.service';
import { AuditService } from './audit.service';
import { AuthUser } from './auth.types';
import { FeatureFlagsService } from './feature-flags.service';
import { PrismaService } from './prisma.service';
import { tenantWhere } from './agent-namespace';

export type AiAgentTargetInput = {
  targetType: AiAgentTargetType;
  targetKey: string;
  instanceId?: string | null;
  displayName?: string;
  metadata?: Record<string, unknown>;
};

export type AiAgentInput = {
  name: string;
  description?: string | null;
  scope?: AiAgentScope;
  activationMode?: AiAgentActivationMode;
  enabled?: boolean;
  priority?: number;
  allInstances?: boolean;
  instanceIds?: string[];
  targets?: AiAgentTargetInput[];
  aiProviderId: string;
  aiModel?: string | null;
  systemPrompt?: string;
  agentPrompt?: string;
  fallbackResponse?: string;
  temperature?: number;
  maxTokens?: number;
  historyLimit?: number;
  sessionTtlSeconds?: number;
  extendSessionOnMessage?: boolean;
  activationMatchType?: AiAgentMatchType;
  activationKeywords?: string[];
  deactivationMatchType?: AiAgentMatchType;
  deactivationKeywords?: string[];
  consumeActivationMessage?: boolean;
  includePreviousContext?: boolean;
  openingMessage?: string | null;
  closingMessage?: string | null;
  groupResponseMode?: AiAgentGroupResponseMode;
  groupMemoryMode?: AiAgentGroupMemoryMode;
  scopeContract?: Record<string, unknown>;
  memoryPolicy?: Record<string, unknown>;
};

const agentInclude = {
  aiProvider: { select: { id: true, name: true, prefix: true, protocol: true, defaultModel: true, enabled: true } },
  instances: {
    include: { instance: { select: { id: true, name: true, engine: true, status: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  targets: { orderBy: { createdAt: 'asc' as const } },
  knowledge: {
    include: { knowledgeSource: { select: { id: true, name: true, type: true, enabled: true, lastStatus: true } } },
    orderBy: { priority: 'asc' as const },
  },
  _count: { select: { sessions: true, executions: true, evaluationCases: true } },
} satisfies Prisma.AiAgentInclude;

@Injectable()
export class AiAgentsService {
  constructor(
    private readonly db: PrismaService,
    private readonly providers: AiProvidersService,
    private readonly audit: AuditService,
    private readonly flags: FeatureFlagsService,
  ) {}

  list(user: AuthUser) {
    this.flags.assertAiAgentV2();
    return this.db.aiAgent.findMany({
      where: tenantWhere(user),
      include: agentInclude,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async get(user: AuthUser, id: string) {
    this.flags.assertAiAgentV2();
    const agent = await this.db.aiAgent.findFirst({ where: tenantWhere(user, { id }), include: agentInclude });
    if (!agent) throw new NotFoundException('ai_agent_not_found');
    return agent;
  }

  async create(user: AuthUser, input: AiAgentInput) {
    this.flags.assertAiAgentV2();
    const normalized = await this.normalizeAndValidate(user, input);
    const agent = await this.db.$transaction(async (tx) => {
      const created = await tx.aiAgent.create({
        data: {
          tenantId: user.tenantId,
          createdByUserId: user.userId,
          ...normalized.data,
          instances: normalized.instanceIds.length
            ? { create: normalized.instanceIds.map((instanceId) => ({ tenantId: user.tenantId, instanceId })) }
            : undefined,
          targets: normalized.targets.length
            ? { create: normalized.targets.map((target) => ({ ...target, tenantId: user.tenantId })) }
            : undefined,
        },
        include: agentInclude,
      });
      await tx.aiAgentVersion.create({
        data: {
          tenantId: user.tenantId,
          agentId: created.id,
          createdByUserId: user.userId,
          version: 1,
          config: this.snapshot(created),
          changeNote: 'Konfigurasi awal',
        },
      });
      return created;
    });
    await this.audit.log(user, 'ai_agent.created', agent.id, { name: agent.name, scope: agent.scope });
    return agent;
  }

  async update(user: AuthUser, id: string, input: Partial<AiAgentInput>) {
    this.flags.assertAiAgentV2();
    const current = await this.get(user, id);
    const merged: AiAgentInput = {
      name: input.name ?? current.name,
      description: input.description === undefined ? current.description : input.description,
      scope: input.scope ?? current.scope,
      activationMode: input.activationMode ?? current.activationMode,
      enabled: input.enabled ?? current.enabled,
      priority: input.priority ?? current.priority,
      allInstances: input.allInstances ?? current.allInstances,
      instanceIds: input.instanceIds ?? current.instances.map((assignment) => assignment.instanceId),
      targets: input.targets ?? current.targets.map((target) => ({
        targetType: target.targetType,
        targetKey: target.targetKey,
        instanceId: target.instanceId,
        displayName: target.displayName ?? undefined,
        metadata: this.jsonRecord(target.metadata),
      })),
      aiProviderId: input.aiProviderId ?? current.aiProviderId,
      aiModel: input.aiModel === undefined ? current.aiModel : input.aiModel,
      systemPrompt: input.systemPrompt ?? current.systemPrompt,
      agentPrompt: input.agentPrompt ?? current.agentPrompt,
      fallbackResponse: input.fallbackResponse ?? current.fallbackResponse,
      temperature: input.temperature ?? current.temperature,
      maxTokens: input.maxTokens ?? current.maxTokens,
      historyLimit: input.historyLimit ?? current.historyLimit,
      sessionTtlSeconds: input.sessionTtlSeconds ?? current.sessionTtlSeconds,
      extendSessionOnMessage: input.extendSessionOnMessage ?? current.extendSessionOnMessage,
      activationMatchType: input.activationMatchType ?? current.activationMatchType,
      activationKeywords: input.activationKeywords ?? current.activationKeywords,
      deactivationMatchType: input.deactivationMatchType ?? current.deactivationMatchType,
      deactivationKeywords: input.deactivationKeywords ?? current.deactivationKeywords,
      consumeActivationMessage: input.consumeActivationMessage ?? current.consumeActivationMessage,
      includePreviousContext: input.includePreviousContext ?? current.includePreviousContext,
      openingMessage: input.openingMessage === undefined ? current.openingMessage : input.openingMessage,
      closingMessage: input.closingMessage === undefined ? current.closingMessage : input.closingMessage,
      groupResponseMode: input.groupResponseMode ?? current.groupResponseMode,
      groupMemoryMode: input.groupMemoryMode ?? current.groupMemoryMode,
      scopeContract: input.scopeContract ?? this.jsonRecord(current.scopeContract),
      memoryPolicy: input.memoryPolicy ?? this.jsonRecord(current.memoryPolicy),
    };
    const normalized = await this.normalizeAndValidate(user, merged);

    const updated = await this.db.$transaction(async (tx) => {
      await tx.aiAgentInstance.deleteMany({ where: { agentId: id } });
      await tx.aiAgentTarget.deleteMany({ where: { agentId: id } });
      const result = await tx.aiAgent.update({
        where: { id },
        data: {
          ...normalized.data,
          currentVersion: { increment: 1 },
          instances: normalized.instanceIds.length
            ? { create: normalized.instanceIds.map((instanceId) => ({ tenantId: user.tenantId, instanceId })) }
            : undefined,
          targets: normalized.targets.length
            ? { create: normalized.targets.map((target) => ({ ...target, tenantId: user.tenantId })) }
            : undefined,
        },
        include: agentInclude,
      });
      await tx.aiAgentVersion.create({
        data: {
          tenantId: user.tenantId,
          agentId: id,
          createdByUserId: user.userId,
          version: result.currentVersion,
          config: this.snapshot(result),
          changeNote: 'Konfigurasi diperbarui',
        },
      });
      return result;
    });
    await this.audit.log(user, 'ai_agent.updated', id, { name: updated.name, version: updated.currentVersion });
    return updated;
  }

  async remove(user: AuthUser, id: string) {
    this.flags.assertAiAgentV2();
    const agent = await this.get(user, id);
    const activeSessions = await this.db.aiAgentSession.count({ where: { agentId: id, status: { in: ['ACTIVE', 'PAUSED', 'HANDED_OFF'] } } });
    if (activeSessions) throw new BadRequestException('ai_agent_has_open_sessions');
    await this.db.aiAgent.delete({ where: { id } });
    await this.audit.log(user, 'ai_agent.deleted', id, { name: agent.name });
    return { deleted: true, id };
  }

  async duplicate(user: AuthUser, id: string) {
    this.flags.assertAiAgentV2();
    const source = await this.get(user, id);
    return this.create(user, {
      name: `${source.name} (Salinan)`,
      description: source.description,
      scope: source.scope,
      activationMode: source.activationMode,
      enabled: false,
      priority: source.priority,
      allInstances: source.allInstances,
      instanceIds: source.instances.map((item) => item.instanceId),
      targets: source.targets.map((target) => ({
        targetType: target.targetType,
        targetKey: target.targetKey,
        instanceId: target.instanceId,
        displayName: target.displayName ?? undefined,
        metadata: this.jsonRecord(target.metadata),
      })),
      aiProviderId: source.aiProviderId,
      aiModel: source.aiModel,
      systemPrompt: source.systemPrompt,
      agentPrompt: source.agentPrompt,
      fallbackResponse: source.fallbackResponse,
      temperature: source.temperature,
      maxTokens: source.maxTokens,
      historyLimit: source.historyLimit,
      sessionTtlSeconds: source.sessionTtlSeconds,
      extendSessionOnMessage: source.extendSessionOnMessage,
      activationMatchType: source.activationMatchType,
      activationKeywords: source.activationKeywords,
      deactivationMatchType: source.deactivationMatchType,
      deactivationKeywords: source.deactivationKeywords,
      consumeActivationMessage: source.consumeActivationMessage,
      includePreviousContext: source.includePreviousContext,
      openingMessage: source.openingMessage,
      closingMessage: source.closingMessage,
      groupResponseMode: source.groupResponseMode,
      groupMemoryMode: source.groupMemoryMode,
      scopeContract: this.jsonRecord(source.scopeContract),
      memoryPolicy: this.jsonRecord(source.memoryPolicy),
    });
  }

  async setEnabled(user: AuthUser, id: string, enabled: boolean) {
    this.flags.assertAiAgentV2();
    const current = await this.get(user, id);
    if (enabled) {
      await this.normalizeAndValidate(user, {
        ...current,
        enabled: true,
        instanceIds: current.instances.map((item) => item.instanceId),
        targets: current.targets.map((target) => ({
          targetType: target.targetType,
          targetKey: target.targetKey,
          instanceId: target.instanceId,
          displayName: target.displayName ?? undefined,
          metadata: this.jsonRecord(target.metadata),
        })),
        scopeContract: this.jsonRecord(current.scopeContract),
        memoryPolicy: this.jsonRecord(current.memoryPolicy),
      });
    }
    const result = await this.db.aiAgent.update({ where: { id }, data: { enabled } });
    await this.audit.log(user, enabled ? 'ai_agent.enabled' : 'ai_agent.disabled', id, { name: current.name });
    return result;
  }

  async test(user: AuthUser, id: string, message: string) {
    this.flags.assertAiAgentV2();
    const agent = await this.get(user, id);
    const input = message.trim();
    if (!input) throw new BadRequestException('test_message_required');
    const startedAt = Date.now();
    const completion = await this.providers.completeForTenant(user.tenantId, {
      providerId: agent.aiProviderId,
      model: agent.aiModel ?? undefined,
      systemPrompt: [agent.systemPrompt, agent.agentPrompt].filter(Boolean).join('\n\n'),
      messages: [{ role: 'user', content: input }],
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    });
    return { text: completion.text, latencyMs: Date.now() - startedAt, model: agent.aiModel ?? agent.aiProvider.defaultModel };
  }

  async listTargets(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.db.aiAgentTarget.findMany({ where: tenantWhere(user, { agentId: id }), orderBy: { createdAt: 'asc' } });
  }

  async replaceTargets(user: AuthUser, id: string, targets: AiAgentTargetInput[]) {
    const agent = await this.get(user, id);
    const normalized = await this.normalizeTargets(user, agent.scope, targets);
    await this.db.$transaction(async (tx) => {
      await tx.aiAgentTarget.deleteMany({ where: { agentId: id, tenantId: user.tenantId } });
      if (normalized.length) {
        await tx.aiAgentTarget.createMany({ data: normalized.map((target) => ({ ...target, agentId: id, tenantId: user.tenantId })) });
      }
    });
    await this.audit.log(user, 'ai_agent.targets_replaced', id, { count: normalized.length });
    return this.listTargets(user, id);
  }

  private async normalizeAndValidate(user: AuthUser, input: AiAgentInput) {
    const name = String(input.name ?? '').trim();
    const aiProviderId = String(input.aiProviderId ?? '').trim();
    const scope = this.enumValue(AiAgentScope, input.scope ?? AiAgentScope.GLOBAL, 'invalid_ai_agent_scope');
    const activationMode = this.enumValue(AiAgentActivationMode, input.activationMode ?? AiAgentActivationMode.KEYWORD, 'invalid_ai_agent_activation_mode');
    if (!name) throw new BadRequestException('ai_agent_name_required');
    if (!aiProviderId) throw new BadRequestException('ai_provider_required');

    const provider = await this.db.aiProvider.findFirst({ where: tenantWhere(user, { id: aiProviderId, enabled: true }) });
    if (!provider) throw new NotFoundException('active_ai_provider_not_found');
    const aiModel = input.aiModel?.trim() || provider.defaultModel;
    if (!aiModel) throw new BadRequestException('ai_model_required');

    const allInstances = input.allInstances ?? false;
    const instanceIds = allInstances ? [] : [...new Set(input.instanceIds ?? [])];
    if (instanceIds.length) {
      const count = await this.db.whatsappInstance.count({ where: { tenantId: user.tenantId, id: { in: instanceIds } } });
      if (count !== instanceIds.length) throw new NotFoundException('ai_agent_instance_not_found');
    }
    if ((input.enabled ?? false) && !allInstances && !instanceIds.length) throw new BadRequestException('ai_agent_instance_required');

    const targets = await this.normalizeTargets(user, scope, input.targets ?? []);
    if ((input.enabled ?? false) && scope !== AiAgentScope.GLOBAL && !targets.length) throw new BadRequestException('ai_agent_target_required');

    const activationKeywords = this.keywords(input.activationKeywords ?? []);
    const deactivationKeywords = this.keywords(input.deactivationKeywords ?? ['/stop-ai']);
    if ((input.enabled ?? false) && activationMode === AiAgentActivationMode.KEYWORD && !activationKeywords.length)
      throw new BadRequestException('ai_agent_activation_keyword_required');

    const scopeContract = this.validateScopeContract(input.scopeContract ?? {});
    return {
      instanceIds,
      targets,
      data: {
        name,
        description: input.description?.trim() || null,
        scope,
        activationMode,
        enabled: input.enabled ?? false,
        priority: this.integer(input.priority, 100, 0, 10000),
        allInstances,
        aiProviderId,
        aiModel,
        systemPrompt: String(input.systemPrompt ?? '').trim(),
        agentPrompt: String(input.agentPrompt ?? '').trim(),
        fallbackResponse: String(input.fallbackResponse ?? '').trim(),
        temperature: this.number(input.temperature, 0.7, 0, 2),
        maxTokens: this.integer(input.maxTokens, 500, 1, 32768),
        historyLimit: this.integer(input.historyLimit, 10, 1, 100),
        sessionTtlSeconds: this.integer(input.sessionTtlSeconds, 1800, 60, 604800),
        extendSessionOnMessage: input.extendSessionOnMessage ?? true,
        activationMatchType: this.enumValue(AiAgentMatchType, input.activationMatchType ?? AiAgentMatchType.EXACT, 'invalid_activation_match_type'),
        activationKeywords,
        deactivationMatchType: this.enumValue(AiAgentMatchType, input.deactivationMatchType ?? AiAgentMatchType.EXACT, 'invalid_deactivation_match_type'),
        deactivationKeywords,
        consumeActivationMessage: input.consumeActivationMessage ?? true,
        includePreviousContext: input.includePreviousContext ?? false,
        openingMessage: input.openingMessage?.trim() || null,
        closingMessage: input.closingMessage?.trim() || null,
        groupResponseMode: this.enumValue(AiAgentGroupResponseMode, input.groupResponseMode ?? AiAgentGroupResponseMode.MENTION_ONLY, 'invalid_group_response_mode'),
        groupMemoryMode: this.enumValue(AiAgentGroupMemoryMode, input.groupMemoryMode ?? AiAgentGroupMemoryMode.PER_MEMBER, 'invalid_group_memory_mode'),
        scopeContract: scopeContract as Prisma.InputJsonValue,
        memoryPolicy: this.jsonRecord(input.memoryPolicy ?? {}) as Prisma.InputJsonValue,
      },
    };
  }

  private async normalizeTargets(user: AuthUser, scope: AiAgentScope, targets: AiAgentTargetInput[]) {
    if (scope === AiAgentScope.GLOBAL && targets.length) throw new BadRequestException('global_ai_agent_cannot_have_targets');
    const expectedType = scope === AiAgentScope.CONTACT ? AiAgentTargetType.CONTACT : AiAgentTargetType.GROUP;
    const normalized = targets.map((target) => ({
      targetType: this.enumValue(AiAgentTargetType, target.targetType, 'invalid_ai_agent_target_type'),
      targetKey: String(target.targetKey ?? '').trim(),
      instanceId: target.instanceId || null,
      displayName: target.displayName?.trim() || null,
      metadata: this.jsonRecord(target.metadata ?? {}) as Prisma.InputJsonValue,
    }));
    if (normalized.some((target) => target.targetType !== expectedType || !target.targetKey))
      throw new BadRequestException('ai_agent_target_scope_mismatch');
    const duplicateKeys = normalized.map((target) => `${target.targetType}:${target.targetKey}`);
    if (new Set(duplicateKeys).size !== duplicateKeys.length) throw new BadRequestException('duplicate_ai_agent_target');
    const instanceIds = [...new Set(normalized.map((target) => target.instanceId).filter((id): id is string => Boolean(id)))];
    if (instanceIds.length) {
      const count = await this.db.whatsappInstance.count({ where: { tenantId: user.tenantId, id: { in: instanceIds } } });
      if (count !== instanceIds.length) throw new NotFoundException('ai_agent_target_instance_not_found');
    }
    return normalized;
  }

  private validateScopeContract(value: Record<string, unknown>) {
    const contract = this.jsonRecord(value);
    const arrayKeys = ['allowedTopics', 'blockedTopics', 'allowedTools'];
    for (const key of arrayKeys) {
      if (contract[key] !== undefined && (!Array.isArray(contract[key]) || (contract[key] as unknown[]).some((item) => typeof item !== 'string')))
        throw new BadRequestException(`invalid_scope_contract_${key}`);
    }
    const action = contract.outOfScopeAction;
    if (action !== undefined && !['REJECT', 'HANDOFF', 'STATIC_RESPONSE', 'IGNORE'].includes(String(action)))
      throw new BadRequestException('invalid_scope_contract_action');
    return contract;
  }

  private keywords(values: string[]) {
    return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].slice(0, 100);
  }

  private enumValue<T extends Record<string, string>>(source: T, value: unknown, error: string): T[keyof T] {
    if (!Object.values(source).includes(value as string)) throw new BadRequestException(error);
    return value as T[keyof T];
  }

  private integer(value: number | undefined, fallback: number, minimum: number, maximum: number) {
    const parsed = value === undefined ? fallback : Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new BadRequestException('invalid_ai_agent_numeric_setting');
    return parsed;
  }

  private number(value: number | undefined, fallback: number, minimum: number, maximum: number) {
    const parsed = value === undefined ? fallback : Number(value);
    if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new BadRequestException('invalid_ai_agent_numeric_setting');
    return parsed;
  }

  private jsonRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private snapshot(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
