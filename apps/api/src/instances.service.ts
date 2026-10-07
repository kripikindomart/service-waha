import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';
import { AuditService } from './audit.service';
import { normalizeEngine, wahaClient } from './waha.client';

@Injectable()
export class InstancesService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  async list(user: AuthUser) {
    const instances = await this.db.whatsappInstance.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(instances.map(async (instance) => {
      const live = await this.liveStatus(instance);
      return { ...instance, ...live };
    }));
  }

  async create(user: AuthUser, name: string, requestedEngine = 'NOWEB') {
    const engine = normalizeEngine(requestedEngine);
    const normalizedName = name.trim();
    const existing = await this.db.whatsappInstance.findFirst({
      where: { tenantId: user.tenantId, name: normalizedName },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Nama instance sudah digunakan. Gunakan nama lain atau jalankan instance yang sudah ada.');
    const defaultWebhook = await this.db.webhookEndpoint.findFirst({
      where: { tenantId: user.tenantId, isDefault: true, enabled: true },
    });
    const instance = await this.db.whatsappInstance.create({
      data: {
        tenantId: user.tenantId,
        name: normalizedName,
        engine,
        wahaSession: `${user.tenantId}-${normalizedName}`,
        webhookEndpointId: defaultWebhook?.id,
      },
    });

    try {
      await this.createProviderSession(instance);
    } catch (error) {
      // Provider provisioning is part of instance creation. Do not leave an
      // unusable local row behind when provisioning fails.
      try {
        await wahaClient(engine).delete(this.sessionPath(instance.wahaSession), { timeout: 5000 });
      } catch {
        // Best-effort compensation. The original, sanitized provider error is
        // more useful to the client than a cleanup error.
      }
      await this.db.whatsappInstance.deleteMany({ where: { id: instance.id, tenantId: user.tenantId } });
      throw this.providerException(instance, 'membuat session', error);
    }

    await this.audit.log(user, 'instance.create', instance.id, { name: normalizedName, engine });
    return instance;
  }

  start(user: AuthUser, id: string) { return this.control(user, id, 'start'); }
  stop(user: AuthUser, id: string) { return this.control(user, id, 'stop'); }

  async remove(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');

    const client = wahaClient(instance.engine);
    const sessionPath = this.sessionPath(instance.wahaSession);
    try {
      await this.deleteProviderSession(client, sessionPath);
      await this.verifyProviderSessionRemoved(client, sessionPath);
    } catch (error) {
      throw this.providerException(instance, 'menghapus session beserta data autentikasinya', error);
    }

    await this.audit.log(user, 'instance.delete', id, { name: instance.name, providerSessionRemoved: true });
    return this.db.whatsappInstance.delete({ where: { id } });
  }

  async status(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    return this.liveStatus(instance, true);
  }

  async qr(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    try {
      const client = wahaClient(instance.engine);
      const session = await client.get(this.sessionPath(instance.wahaSession));
      const status = String(session.data?.status ?? '').toUpperCase();
      if (status !== 'SCAN_QR_CODE')
        throw new BadRequestException(`QR belum tersedia. Status session: ${status || 'UNKNOWN'}`);
      const response = await client.get(`/api/${encodeURIComponent(instance.wahaSession)}/auth/qr`, { responseType: 'arraybuffer' });
      return { data: response.data, contentType: response.headers['content-type'] ?? 'image/png' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw this.providerException(instance, 'mengambil QR', error);
    }
  }

  private async control(user: AuthUser, id: string, action: 'start' | 'stop') {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const client = wahaClient(instance.engine);
    const sessionPath = this.sessionPath(instance.wahaSession);
    let response;

    try {
      if (action === 'start') {
        // A database row may survive an older failed provisioning attempt or a
        // provider restart. Recreate the provider session before starting it.
        await this.ensureProviderSession(instance, client);
      }

      try {
        response = await client.post(`${sessionPath}/${action}`, {});
      } catch (error) {
        if (action === 'stop' && this.isNotFound(error)) {
          await this.db.whatsappInstance.update({ where: { id }, data: { status: 'STOPPED' } });
          await this.audit.log(user, 'instance.stop', id, { providerSessionMissing: true });
          return { name: instance.wahaSession, status: 'STOPPED' };
        }
        if (action !== 'start' || !this.isNotFound(error)) throw error;

        // Handle a provider race where the session disappeared between the
        // existence check and the start request.
        await this.createProviderSession(instance);
        response = await client.post(`${sessionPath}/start`, {});
      }
    } catch (error) {
      throw this.providerException(instance, `menjalankan ${action}`, error);
    }

    const providerStatus = String(response.data?.status ?? '').toUpperCase();
    await this.db.whatsappInstance.update({
      where: { id },
      data: {
        status: action === 'start' && providerStatus.includes('FAIL')
          ? 'FAILED'
          : action === 'start'
            ? 'STARTING'
            : 'STOPPED',
      },
    });
    await this.audit.log(user, `instance.${action}`, id);
    return response.data;
  }

  private async ensureProviderSession(instance: any, client = wahaClient(instance.engine)) {
    try {
      await client.get(this.sessionPath(instance.wahaSession), { timeout: 8000 });
      return;
    } catch (error) {
      if (!this.isNotFound(error)) throw error;
    }

    try {
      await this.createProviderSession(instance);
    } catch (error) {
      // A concurrent request may have created the same session.
      if (!axios.isAxiosError(error) || error.response?.status !== 409) throw error;
      await client.get(this.sessionPath(instance.wahaSession), { timeout: 8000 });
    }
  }

  private async createProviderSession(instance: any) {
    const config = await this.buildSessionConfig(instance);
    return wahaClient(instance.engine).post('/api/sessions', {
      name: instance.wahaSession,
      config,
    });
  }

  private async buildSessionConfig(instance: any) {
    const webhook = instance.webhookEndpointId
      ? await this.db.webhookEndpoint.findFirst({
          where: { id: instance.webhookEndpointId, tenantId: instance.tenantId, enabled: true },
        })
      : await this.db.webhookEndpoint.findFirst({
          where: { tenantId: instance.tenantId, isDefault: true, enabled: true },
        });
    const webhookUrl = webhook?.url ?? process.env.WAHA_WEBHOOK_URL;
    const webhookEvents = webhook?.events ?? ['message', 'message.any', 'message.ack', 'session.status'];
    const engineConfig = normalizeEngine(instance.engine) === 'GOWS'
      ? { gows: { storage: { messages: true, groups: true, chats: true, contacts: true, labels: true } } }
      : { noweb: { markOnline: true, store: { enabled: true, fullSync: true } } };
    return {
      ...engineConfig,
      ...(webhookUrl
        ? { webhooks: [{ url: webhookUrl, events: webhookEvents, ...(webhook?.secret ? { hmac: { key: webhook.secret } } : {}) }] }
        : {}),
    };
  }

  private async deleteProviderSession(client: AxiosInstance, sessionPath: string) {
    try {
      await client.delete(sessionPath);
    } catch (error) {
      if (!this.isNotFound(error)) throw error;
    }
  }

  private async verifyProviderSessionRemoved(client: AxiosInstance, sessionPath: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await client.get(sessionPath, { timeout: 8000 });
      } catch (error) {
        if (this.isNotFound(error)) return;
        throw error;
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await this.deleteProviderSession(client, sessionPath);
      }
    }
    throw new Error('provider_session_still_exists');
  }

  private sessionPath(session: string) {
    return `/api/sessions/${encodeURIComponent(session)}`;
  }

  private isNotFound(error: unknown) {
    return axios.isAxiosError(error) && error.response?.status === 404;
  }

  private providerException(instance: { engine: string; name: string }, action: string, error: unknown) {
    let detail = 'Layanan engine tidak dapat dihubungi.';
    if (axios.isAxiosError(error)) {
      const providerMessage = error.response?.data?.message ?? error.response?.data?.error;
      if (typeof providerMessage === 'string' && providerMessage.trim()) detail = providerMessage.trim();
      else if (error.code) detail = `Koneksi gagal (${error.code}).`;
    } else if (error instanceof Error && error.message === 'provider_session_still_exists') {
      detail = 'Session masih terdeteksi setelah proses penghapusan.';
    }
    return new BadGatewayException(`Engine ${normalizeEngine(instance.engine)} gagal ${action} untuk instance ${instance.name}. ${detail}`);
  }

  private async liveStatus(instance: { id: string; engine: string; wahaSession: string; status: any }, includePayload = false) {
    try {
      const response = await wahaClient(instance.engine).get(this.sessionPath(instance.wahaSession), { timeout: 8000 });
      const providerStatus = String(response.data?.status ?? 'UNKNOWN').toUpperCase();
      const mapped = providerStatus.includes('WORK') || providerStatus === 'CONNECTED'
        ? 'WORKING'
        : providerStatus.includes('START') || providerStatus.includes('SCAN_QR') || providerStatus.includes('AUTHENTICAT')
          ? 'STARTING'
          : providerStatus.includes('STOP')
            ? 'STOPPED'
            : 'FAILED';
      if (mapped !== instance.status)
        await this.db.whatsappInstance.update({ where: { id: instance.id }, data: { status: mapped as any } });
      return {
        ...(includePayload && response.data && typeof response.data === 'object' ? response.data : {}),
        status: providerStatus,
        providerStatus,
        providerReachable: true,
        liveCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (instance.status !== 'FAILED')
        await this.db.whatsappInstance.update({ where: { id: instance.id }, data: { status: 'FAILED' } });
      return {
        status: 'UNREACHABLE',
        providerStatus: 'UNREACHABLE',
        providerReachable: false,
        liveCheckedAt: new Date().toISOString(),
        error: axios.isAxiosError(error)
          ? (error.response?.data?.message ?? error.response?.data?.error ?? error.code ?? error.message)
          : 'provider_unreachable',
      };
    }
  }
}
