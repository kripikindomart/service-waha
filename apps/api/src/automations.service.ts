import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiProvidersService } from './ai-providers.service';
import { AuthUser } from './auth.types';
import { htmlToWhatsApp } from './message-format';
import { MessagesService } from './messages.service';
import { PrismaService } from './prisma.service';

type AutomationInput = {
  name: string;
  trigger: 'contains' | 'exact' | 'any';
  keyword?: string;
  response?: string;
  instanceId?: string | null;
  enabled?: boolean;
  cooldownSeconds?: number;
  responseMode?: 'STATIC' | 'AI';
  aiProviderId?: string | null;
  aiModel?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  historyLimit?: number;
};

const providerSelect = {
  id: true, name: true, prefix: true, protocol: true, defaultModel: true, enabled: true,
} as const;

@Injectable()
export class AutomationsService {
  constructor(
    private readonly db: PrismaService,
    private readonly messages: MessagesService,
    private readonly aiProviders: AiProvidersService,
  ) {}

  list(user: AuthUser) {
    return this.db.automationRule.findMany({
      where: { tenantId: user.tenantId },
      include: {
        instance: { select: { id: true, name: true, engine: true } },
        aiProvider: { select: providerSelect },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(user: AuthUser, input: AutomationInput) {
    this.validate(input);
    if (input.instanceId) {
      const instance = await this.db.whatsappInstance.findFirst({ where: { id: input.instanceId, tenantId: user.tenantId } });
      if (!instance) throw new NotFoundException('instance_not_found');
    }
    if (input.responseMode === 'AI') await this.assertAiProvider(user, input.aiProviderId);
    return this.db.automationRule.create({
      data: {
        tenantId: user.tenantId,
        instanceId: input.instanceId || null,
        name: input.name.trim(),
        trigger: input.trigger,
        keyword: input.trigger === 'any' ? '' : String(input.keyword ?? '').trim(),
        response: htmlToWhatsApp(input.response ?? ''),
        enabled: input.enabled ?? true,
        cooldownSeconds: Math.max(1, Math.min(3600, input.cooldownSeconds ?? 5)),
        responseMode: input.responseMode ?? 'STATIC',
        aiProviderId: input.responseMode === 'AI' ? input.aiProviderId : null,
        aiModel: input.responseMode === 'AI' ? input.aiModel?.trim() || null : null,
        systemPrompt: input.responseMode === 'AI' ? input.systemPrompt?.trim() || null : null,
        temperature: Math.max(0, Math.min(2, input.temperature ?? 0.7)),
        maxTokens: Math.max(1, Math.min(8192, input.maxTokens ?? 500)),
        historyLimit: Math.max(1, Math.min(50, input.historyLimit ?? 10)),
      },
      include: {
        instance: { select: { id: true, name: true, engine: true } },
        aiProvider: { select: providerSelect },
      },
    });
  }

  async update(user: AuthUser, id: string, input: Partial<AutomationInput>) {
    const existing = await this.db.automationRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!existing) throw new NotFoundException('automation_not_found');
    const merged: AutomationInput = {
      name: input.name ?? existing.name,
      trigger: input.trigger ?? (existing.trigger as AutomationInput['trigger']),
      keyword: input.keyword ?? existing.keyword,
      response: input.response ?? existing.response,
      instanceId: input.instanceId === undefined ? existing.instanceId : input.instanceId,
      enabled: input.enabled ?? existing.enabled,
      cooldownSeconds: input.cooldownSeconds ?? existing.cooldownSeconds,
      responseMode: input.responseMode ?? (existing.responseMode as AutomationInput['responseMode']),
      aiProviderId: input.aiProviderId === undefined ? existing.aiProviderId : input.aiProviderId,
      aiModel: input.aiModel ?? existing.aiModel ?? undefined,
      systemPrompt: input.systemPrompt ?? existing.systemPrompt ?? undefined,
      temperature: input.temperature ?? existing.temperature,
      maxTokens: input.maxTokens ?? existing.maxTokens,
      historyLimit: input.historyLimit ?? existing.historyLimit,
    };
    this.validate(merged);
    if (merged.instanceId) {
      const instance = await this.db.whatsappInstance.findFirst({ where: { id: merged.instanceId, tenantId: user.tenantId } });
      if (!instance) throw new NotFoundException('instance_not_found');
    }
    if (merged.responseMode === 'AI') await this.assertAiProvider(user, merged.aiProviderId);
    return this.db.automationRule.update({
      where: { id },
      data: {
        name: merged.name.trim(),
        trigger: merged.trigger,
        keyword: merged.trigger === 'any' ? '' : String(merged.keyword ?? '').trim(),
        response: htmlToWhatsApp(merged.response ?? ''),
        instanceId: merged.instanceId || null,
        enabled: merged.enabled,
        cooldownSeconds: Math.max(1, Math.min(3600, merged.cooldownSeconds ?? 5)),
        responseMode: merged.responseMode ?? 'STATIC',
        aiProviderId: merged.responseMode === 'AI' ? merged.aiProviderId : null,
        aiModel: merged.responseMode === 'AI' ? merged.aiModel?.trim() || null : null,
        systemPrompt: merged.responseMode === 'AI' ? merged.systemPrompt?.trim() || null : null,
        temperature: Math.max(0, Math.min(2, merged.temperature ?? 0.7)),
        maxTokens: Math.max(1, Math.min(8192, merged.maxTokens ?? 500)),
        historyLimit: Math.max(1, Math.min(50, merged.historyLimit ?? 10)),
      },
      include: {
        instance: { select: { id: true, name: true, engine: true } },
        aiProvider: { select: providerSelect },
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const result = await this.db.automationRule.deleteMany({ where: { id, tenantId: user.tenantId } });
    if (!result.count) throw new NotFoundException('automation_not_found');
    return { deleted: true, id };
  }

  async handleInbound(tenantId: string, instanceId: string, chatId: string, text: string, inboundMessageId: string) {
    const normalized = text.trim().toLocaleLowerCase('id-ID');
    const rules = await this.db.automationRule.findMany({
      where: { tenantId, enabled: true, OR: [{ instanceId }, { instanceId: null }] },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    rules.sort((left, right) => Number(left.instanceId === null) - Number(right.instanceId === null));
    const rule = rules.find((item) => {
      const keyword = item.keyword.trim().toLocaleLowerCase('id-ID');
      return item.trigger === 'any' || (item.trigger === 'exact' ? normalized === keyword : normalized.includes(keyword));
    });
    if (!rule) return null;
    const recent = await this.db.automationExecution.findFirst({
      where: { ruleId: rule.id, chatId, createdAt: { gte: new Date(Date.now() - rule.cooldownSeconds * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return null;
    let execution;
    try {
      execution = await this.db.automationExecution.create({
        data: { tenantId, instanceId, ruleId: rule.id, chatId, inboundMessageId },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return null;
      throw error;
    }

    let response = rule.response
      .replace(/\{\{\s*message\s*\}\}/gi, text)
      .replace(/\{\{\s*chat_id\s*\}\}/gi, chatId);
    let aiError: string | null = null;
    if (rule.responseMode === 'AI' && rule.aiProviderId) {
      try {
        const conversation = await this.db.conversation.findUnique({
          where: { instanceId_chatId: { instanceId, chatId } },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: Math.max(1, Math.min(50, rule.historyLimit)),
              select: { direction: true, body: true },
            },
          },
        });
        const history = (conversation?.messages ?? [])
          .reverse()
          .filter((message) => Boolean(message.body?.trim()))
          .map((message) => ({
            role: message.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
            content: message.body!.trim(),
          }));
        const completion = await this.aiProviders.completeForTenant(tenantId, {
          providerId: rule.aiProviderId,
          model: rule.aiModel ?? undefined,
          systemPrompt: (rule.systemPrompt ?? '')
            .replace(/\{\{\s*message\s*\}\}/gi, text)
            .replace(/\{\{\s*chat_id\s*\}\}/gi, chatId),
          messages: history.length ? history : [{ role: 'user', content: text }],
          temperature: rule.temperature,
          maxTokens: rule.maxTokens,
        });
        response = htmlToWhatsApp(completion.text);
      } catch (error: any) {
        aiError = error?.message ?? 'ai_completion_failed';
        if (!response.trim()) throw error;
      }
    }

    try {
      const queued = await this.messages.sendText(
        { tenantId, userId: 'automation', isSuperAdmin: false },
        instanceId,
        chatId,
        response,
      );
      await this.db.automationExecution.update({
        where: { id: execution.id },
        data: { status: aiError ? 'QUEUED_FALLBACK' : 'QUEUED', outboundMessageId: queued.id, error: aiError },
      });
      return { ruleId: rule.id, messageId: queued.id, usedFallback: Boolean(aiError) };
    } catch (error: any) {
      await this.db.automationExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', error: error?.message ?? 'automation_failed' },
      });
      throw error;
    }
  }

  private validate(input: AutomationInput) {
    if (!input.name?.trim()) throw new BadRequestException('automation_fields_required');
    if (!['contains', 'exact', 'any'].includes(input.trigger)) throw new BadRequestException('invalid_automation_trigger');
    if (input.trigger !== 'any' && !input.keyword?.trim()) throw new BadRequestException('automation_keyword_required');
    if ((input.responseMode ?? 'STATIC') === 'STATIC' && !input.response?.trim()) throw new BadRequestException('automation_response_required');
    if (input.responseMode === 'AI' && !input.aiProviderId) throw new BadRequestException('ai_provider_required');
  }

  private async assertAiProvider(user: AuthUser, providerId?: string | null) {
    if (!providerId) throw new BadRequestException('ai_provider_required');
    const provider = await this.db.aiProvider.findFirst({ where: { id: providerId, tenantId: user.tenantId, enabled: true } });
    if (!provider) throw new NotFoundException('active_ai_provider_not_found');
  }
}
