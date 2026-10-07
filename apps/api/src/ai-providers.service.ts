import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { AuthUser } from './auth.types';
import { AuditService } from './audit.service';
import { credentialHint, decryptCredential, encryptCredential } from './ai-credentials.crypto';
import { PrismaService } from './prisma.service';

export type AiProtocol = 'OPENAI' | 'ANTHROPIC';
export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

type ProviderInput = {
  name: string;
  prefix: string;
  protocol: AiProtocol;
  baseUrl: string;
  defaultModel?: string;
  enabled?: boolean;
  roundRobin?: boolean;
};

type CompletionInput = {
  providerId: string;
  model?: string;
  systemPrompt?: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

@Injectable()
export class AiProvidersService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  list(user: AuthUser) {
    return this.db.aiProvider.findMany({
      where: { tenantId: user.tenantId },
      include: {
        credentials: {
          select: {
            id: true, label: true, keyHint: true, enabled: true, lastStatus: true,
            lastError: true, lastLatencyMs: true, lastCheckedAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        models: { orderBy: { modelId: 'asc' } },
        _count: { select: { automationRules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthUser, id: string) {
    const provider = await this.db.aiProvider.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        credentials: {
          select: {
            id: true, label: true, keyHint: true, enabled: true, lastStatus: true,
            lastError: true, lastLatencyMs: true, lastCheckedAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        models: { orderBy: { modelId: 'asc' } },
        _count: { select: { automationRules: true } },
      },
    });
    if (!provider) throw new NotFoundException('ai_provider_not_found');
    return provider;
  }

  async create(user: AuthUser, input: ProviderInput & { apiKey?: string; modelId?: string }) {
    this.validateProvider(input);
    const provider = await this.db.aiProvider.create({
      data: {
        tenantId: user.tenantId,
        name: input.name.trim(),
        prefix: this.normalizePrefix(input.prefix),
        protocol: input.protocol,
        baseUrl: this.normalizeBaseUrl(input.baseUrl),
        defaultModel: input.defaultModel?.trim() || input.modelId?.trim() || null,
        enabled: input.enabled ?? true,
        roundRobin: input.roundRobin ?? true,
      },
    });
    if (input.apiKey?.trim()) await this.addCredential(user, provider.id, { label: `${provider.name} #1`, apiKey: input.apiKey });
    if (input.modelId?.trim()) await this.addModel(user, provider.id, input.modelId);
    await this.audit.log(user, 'ai_provider.created', provider.id, { name: provider.name, protocol: provider.protocol });
    return this.get(user, provider.id);
  }

  async update(user: AuthUser, id: string, input: Partial<ProviderInput>) {
    const existing = await this.findOwned(user, id);
    if (input.baseUrl || input.prefix || input.protocol || input.name) {
      this.validateProvider({
        name: input.name ?? existing.name,
        prefix: input.prefix ?? existing.prefix,
        protocol: (input.protocol ?? existing.protocol) as AiProtocol,
        baseUrl: input.baseUrl ?? existing.baseUrl,
      });
    }
    await this.db.aiProvider.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.prefix !== undefined ? { prefix: this.normalizePrefix(input.prefix) } : {}),
        ...(input.protocol !== undefined ? { protocol: input.protocol } : {}),
        ...(input.baseUrl !== undefined ? { baseUrl: this.normalizeBaseUrl(input.baseUrl) } : {}),
        ...(input.defaultModel !== undefined ? { defaultModel: input.defaultModel.trim() || null } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.roundRobin !== undefined ? { roundRobin: input.roundRobin } : {}),
      },
    });
    await this.audit.log(user, 'ai_provider.updated', id, { name: input.name ?? existing.name });
    return this.get(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const provider = await this.findOwned(user, id);
    const used = await this.db.automationRule.count({ where: { aiProviderId: id } });
    if (used) throw new BadRequestException('ai_provider_still_used_by_automation');
    await this.db.aiProvider.delete({ where: { id } });
    await this.audit.log(user, 'ai_provider.deleted', id, { name: provider.name });
    return { deleted: true, id };
  }

  async addCredential(user: AuthUser, providerId: string, input: { label?: string; apiKey: string }) {
    await this.findOwned(user, providerId);
    if (!input.apiKey?.trim()) throw new BadRequestException('api_key_required');
    const encrypted = encryptCredential(input.apiKey.trim());
    const count = await this.db.aiProviderCredential.count({ where: { providerId } });
    const credential = await this.db.aiProviderCredential.create({
      data: {
        providerId,
        label: input.label?.trim() || `API Key #${count + 1}`,
        keyHint: credentialHint(input.apiKey),
        ...encrypted,
      },
      select: { id: true, label: true, keyHint: true, enabled: true, lastStatus: true, createdAt: true },
    });
    await this.audit.log(user, 'ai_provider.credential_created', credential.id, { providerId, label: credential.label });
    return credential;
  }

  async updateCredential(user: AuthUser, providerId: string, credentialId: string, input: { label?: string; apiKey?: string; enabled?: boolean }) {
    await this.findOwned(user, providerId);
    const credential = await this.db.aiProviderCredential.findFirst({ where: { id: credentialId, providerId } });
    if (!credential) throw new NotFoundException('ai_credential_not_found');
    const encrypted = input.apiKey?.trim() ? encryptCredential(input.apiKey.trim()) : null;
    await this.db.aiProviderCredential.update({
      where: { id: credentialId },
      data: {
        ...(input.label !== undefined ? { label: input.label.trim() || credential.label } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(encrypted ? { ...encrypted, keyHint: credentialHint(input.apiKey!) } : {}),
      },
    });
    return this.get(user, providerId);
  }

  async removeCredential(user: AuthUser, providerId: string, credentialId: string) {
    await this.findOwned(user, providerId);
    const result = await this.db.aiProviderCredential.deleteMany({ where: { id: credentialId, providerId } });
    if (!result.count) throw new NotFoundException('ai_credential_not_found');
    return { deleted: true, id: credentialId };
  }

  async checkDraft(input: { protocol: AiProtocol; baseUrl: string; apiKey: string; modelId?: string }) {
    this.validateProvider({ name: 'Connection check', prefix: 'check', protocol: input.protocol, baseUrl: input.baseUrl });
    if (!input.apiKey?.trim()) throw new BadRequestException('api_key_required');
    return this.checkConnection({ protocol: input.protocol, baseUrl: this.normalizeBaseUrl(input.baseUrl) }, input.apiKey, input.modelId);
  }

  async testCredential(user: AuthUser, providerId: string, credentialId: string, modelId?: string) {
    const provider = await this.findOwned(user, providerId);
    const credential = await this.db.aiProviderCredential.findFirst({ where: { id: credentialId, providerId } });
    if (!credential) throw new NotFoundException('ai_credential_not_found');
    const started = Date.now();
    try {
      const result = await this.checkConnection(provider, decryptCredential(credential), modelId || provider.defaultModel || undefined);
      await this.db.aiProviderCredential.update({
        where: { id: credentialId },
        data: { lastStatus: 'CONNECTED', lastError: null, lastLatencyMs: Date.now() - started, lastCheckedAt: new Date() },
      });
      return result;
    } catch (error: any) {
      await this.db.aiProviderCredential.update({
        where: { id: credentialId },
        data: { lastStatus: 'FAILED', lastError: error?.message ?? 'connection_failed', lastLatencyMs: Date.now() - started, lastCheckedAt: new Date() },
      });
      throw error;
    }
  }

  async importModels(user: AuthUser, providerId: string, credentialId?: string) {
    const provider = await this.findOwned(user, providerId);
    const credential = credentialId
      ? await this.db.aiProviderCredential.findFirst({ where: { id: credentialId, providerId, enabled: true } })
      : await this.db.aiProviderCredential.findFirst({ where: { providerId, enabled: true }, orderBy: { createdAt: 'asc' } });
    if (!credential) throw new BadRequestException('active_ai_credential_required');
    const models = await this.discoverModels(provider, decryptCredential(credential));
    if (!models.length) throw new BadGatewayException('provider_returned_no_models');
    await this.db.$transaction(models.slice(0, 1000).map((modelId) => this.db.aiProviderModel.upsert({
      where: { providerId_modelId: { providerId, modelId } },
      update: { enabled: true },
      create: { providerId, modelId },
    })));
    if (!provider.defaultModel) await this.db.aiProvider.update({ where: { id: providerId }, data: { defaultModel: models[0] } });
    return this.get(user, providerId);
  }

  async addModel(user: AuthUser, providerId: string, modelId: string) {
    await this.findOwned(user, providerId);
    const normalized = modelId.trim();
    if (!normalized) throw new BadRequestException('model_id_required');
    return this.db.aiProviderModel.upsert({
      where: { providerId_modelId: { providerId, modelId: normalized } },
      update: { enabled: true },
      create: { providerId, modelId: normalized },
    });
  }

  async removeModel(user: AuthUser, providerId: string, modelId: string) {
    await this.findOwned(user, providerId);
    const result = await this.db.aiProviderModel.deleteMany({ where: { id: modelId, providerId } });
    if (!result.count) throw new NotFoundException('ai_model_not_found');
    return { deleted: true, id: modelId };
  }

  async completeForTenant(tenantId: string, input: CompletionInput) {
    const provider = await this.db.aiProvider.findFirst({
      where: { id: input.providerId, tenantId, enabled: true },
      include: { credentials: { where: { enabled: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!provider) throw new NotFoundException('active_ai_provider_not_found');
    if (!provider.credentials.length) throw new BadRequestException('active_ai_credential_required');
    const index = provider.roundRobin ? provider.credentialCursor % provider.credentials.length : 0;
    if (provider.roundRobin && provider.credentials.length > 1) {
      await this.db.aiProvider.update({ where: { id: provider.id }, data: { credentialCursor: { increment: 1 } } });
    }
    const model = input.model?.trim() || provider.defaultModel;
    if (!model) throw new BadRequestException('ai_model_required');
    let lastError: unknown;
    for (let offset = 0; offset < provider.credentials.length; offset += 1) {
      const credential = provider.credentials[(index + offset) % provider.credentials.length];
      try {
        const result = await this.sendCompletion(provider, decryptCredential(credential), { ...input, model });
        await this.db.aiProviderCredential.update({
          where: { id: credential.id }, data: { lastStatus: 'CONNECTED', lastError: null, lastCheckedAt: new Date() },
        });
        return result;
      } catch (error: any) {
        lastError = error;
        await this.db.aiProviderCredential.update({
          where: { id: credential.id }, data: { lastStatus: 'FAILED', lastError: error?.message ?? 'completion_failed', lastCheckedAt: new Date() },
        });
      }
    }
    throw lastError;
  }

  async complete(user: AuthUser, input: CompletionInput) {
    return this.completeForTenant(user.tenantId, input);
  }

  private async findOwned(user: AuthUser, id: string) {
    const provider = await this.db.aiProvider.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!provider) throw new NotFoundException('ai_provider_not_found');
    return provider;
  }

  private validateProvider(input: Pick<ProviderInput, 'name' | 'prefix' | 'protocol' | 'baseUrl'>) {
    if (!input.name?.trim() || !input.prefix?.trim() || !input.baseUrl?.trim()) throw new BadRequestException('ai_provider_fields_required');
    if (!['OPENAI', 'ANTHROPIC'].includes(input.protocol)) throw new BadRequestException('invalid_ai_protocol');
    let url: URL;
    try { url = new URL(input.baseUrl); } catch { throw new BadRequestException('invalid_ai_base_url'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new BadRequestException('invalid_ai_base_url');
  }

  private normalizePrefix(value: string) {
    const prefix = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!prefix) throw new BadRequestException('invalid_ai_provider_prefix');
    return prefix;
  }

  private normalizeBaseUrl(value: string) { return value.trim().replace(/\/+$/, ''); }

  private authHeaders(protocol: string, apiKey: string) {
    return protocol === 'ANTHROPIC'
      ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
      : { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };
  }

  private async discoverModels(provider: { protocol: string; baseUrl: string }, apiKey: string) {
    try {
      const response = await axios.get(`${provider.baseUrl}/models`, {
        headers: this.authHeaders(provider.protocol, apiKey), timeout: 15_000,
      });
      const data = response.data?.data ?? response.data?.models ?? response.data;
      if (!Array.isArray(data)) return [];
      return [...new Set(data.map((item: any) => String(item?.id ?? item?.name ?? item)).filter(Boolean))].sort();
    } catch (error) { throw this.providerError(error); }
  }

  private async checkConnection(provider: { protocol: string; baseUrl: string }, apiKey: string, modelId?: string) {
    const started = Date.now();
    if (modelId?.trim()) {
      const response = await this.sendCompletion(provider, apiKey, {
        providerId: 'connection-check', model: modelId.trim(), messages: [{ role: 'user', content: 'Reply with OK.' }], maxTokens: 8, temperature: 0,
      });
      return { connected: true, latencyMs: Date.now() - started, model: modelId.trim(), response: response.text };
    }
    const models = await this.discoverModels(provider, apiKey);
    return { connected: true, latencyMs: Date.now() - started, models: models.slice(0, 20), modelCount: models.length };
  }

  private async sendCompletion(
    provider: { protocol: string; baseUrl: string },
    apiKey: string,
    input: CompletionInput & { model: string },
  ) {
    try {
      if (provider.protocol === 'ANTHROPIC') {
        const response = await axios.post(`${provider.baseUrl}/messages`, {
          model: input.model,
          max_tokens: Math.max(1, Math.min(8192, input.maxTokens ?? 500)),
          temperature: Math.max(0, Math.min(1, input.temperature ?? 0.7)),
          ...(input.systemPrompt?.trim() ? { system: input.systemPrompt.trim() } : {}),
          messages: input.messages,
        }, { headers: this.authHeaders(provider.protocol, apiKey), timeout: 60_000 });
        const text = Array.isArray(response.data?.content)
          ? response.data.content.filter((item: any) => item?.type === 'text').map((item: any) => item.text).join('\n')
          : response.data?.content;
        if (!text) throw new Error('provider_returned_empty_response');
        return { text: String(text), model: response.data?.model ?? input.model, usage: response.data?.usage ?? null };
      }
      const messages = [
        ...(input.systemPrompt?.trim() ? [{ role: 'system', content: input.systemPrompt.trim() }] : []),
        ...input.messages,
      ];
      const response = await axios.post(`${provider.baseUrl}/chat/completions`, {
        model: input.model,
        messages,
        temperature: Math.max(0, Math.min(2, input.temperature ?? 0.7)),
        max_tokens: Math.max(1, Math.min(8192, input.maxTokens ?? 500)),
      }, { headers: this.authHeaders(provider.protocol, apiKey), timeout: 60_000 });
      const content = response.data?.choices?.[0]?.message?.content;
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content) ? content.map((item: any) => item?.text ?? '').join('\n') : '';
      if (!text) throw new Error('provider_returned_empty_response');
      return { text, model: response.data?.model ?? input.model, usage: response.data?.usage ?? null };
    } catch (error) { throw this.providerError(error); }
  }

  private providerError(error: unknown) {
    if (error instanceof BadGatewayException) return error;
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const detail = axiosError.response?.data?.error?.message
        ?? axiosError.response?.data?.message
        ?? axiosError.response?.statusText
        ?? axiosError.message;
      return new BadGatewayException(`ai_provider_error: ${String(detail).slice(0, 500)}`);
    }
    return new BadGatewayException(error instanceof Error ? error.message : 'ai_provider_error');
  }
}
