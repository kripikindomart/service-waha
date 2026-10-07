import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AiProvidersService } from './ai-providers.service';
import { htmlToWhatsApp } from './message-format';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';

@Processor('ai-agent-execution')
export class AiAgentProcessor extends WorkerHost {
  constructor(
    private readonly db: PrismaService,
    private readonly providers: AiProvidersService,
    private readonly messages: MessagesService,
  ) { super(); }

  async process(job: Job<{ executionId: string; text: string }>) {
    const execution = await this.db.aiAgentExecution.findUnique({
      where: { id: job.data.executionId },
      include: { agent: true, session: true, instance: true },
    });
    if (!execution || ['COMPLETED', 'FALLBACK'].includes(execution.status)) return;
    await this.db.aiAgentExecution.update({ where: { id: execution.id }, data: { status: 'PROCESSING' } });
    const startedAt = Date.now();
    try {
      const conversation = await this.db.conversation.findUnique({
        where: { instanceId_chatId: { instanceId: execution.instanceId, chatId: execution.chatId } },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: execution.agent.historyLimit, select: { direction: true, body: true } } },
      });
      const history = (conversation?.messages ?? []).reverse().filter((message) => Boolean(message.body?.trim())).map((message) => ({
        role: message.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
        content: message.body!.trim(),
      }));
      const completion = await this.providers.completeForTenant(execution.tenantId, {
        providerId: execution.agent.aiProviderId,
        model: execution.agent.aiModel ?? undefined,
        systemPrompt: this.systemPrompt(execution.agent, execution.chatId),
        messages: history.length ? history : [{ role: 'user', content: job.data.text }],
        temperature: execution.agent.temperature,
        maxTokens: execution.agent.maxTokens,
      });
      const queued = await this.messages.sendText(
        { tenantId: execution.tenantId, userId: 'ai-agent', isSuperAdmin: false },
        execution.instanceId,
        execution.chatId,
        htmlToWhatsApp(completion.text),
      );
      await this.db.aiAgentExecution.update({
        where: { id: execution.id },
        data: { status: 'COMPLETED', outboundMessageId: queued.id, latencyMs: Date.now() - startedAt, error: null, errorCode: null },
      });
      return { executionId: execution.id, outboundMessageId: queued.id };
    } catch (error: any) {
      const safeError = this.safeError(error);
      if (execution.agent.fallbackResponse.trim()) {
        const queued = await this.messages.sendText(
          { tenantId: execution.tenantId, userId: 'ai-agent', isSuperAdmin: false },
          execution.instanceId,
          execution.chatId,
          execution.agent.fallbackResponse,
        );
        await this.db.aiAgentExecution.update({
          where: { id: execution.id },
          data: { status: 'FALLBACK', outboundMessageId: queued.id, latencyMs: Date.now() - startedAt, errorCode: 'provider_failed', error: safeError },
        });
        return { executionId: execution.id, fallback: true };
      }
      await this.db.aiAgentExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', latencyMs: Date.now() - startedAt, errorCode: 'provider_failed', error: safeError },
      });
      throw error;
    }
  }

  private systemPrompt(agent: any, chatId: string) {
    const scopeContract = JSON.stringify(agent.scopeContract ?? {});
    return [
      agent.systemPrompt,
      agent.agentPrompt,
      `Scope contract wajib dipatuhi: ${scopeContract}`,
    ].filter(Boolean).join('\n\n').replace(/\{\{\s*chat_id\s*\}\}/gi, chatId);
  }

  private safeError(error: any) {
    return String(error?.message ?? 'ai_agent_execution_failed')
      .replace(/(?:bearer|api[_-]?key)\s*[:=]?\s*[A-Za-z0-9._-]+/gi, '[credential_redacted]')
      .slice(0, 1000);
  }
}
