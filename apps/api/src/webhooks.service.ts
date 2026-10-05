import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';
import { wahaClient } from './waha.client';

const DEFAULT_EVENTS = ['message', 'message.any', 'message.ack', 'session.status'];

@Injectable()
export class WebhooksService {
  constructor(private readonly db: PrismaService) {}
  list(user: AuthUser) { return this.db.webhookEndpoint.findMany({ where: { tenantId: user.tenantId }, include: { _count: { select: { instances: true } } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }); }
  async create(user: AuthUser, input: { name: string; url: string; secret?: string; events?: string[]; isDefault?: boolean }) {
    const events = input.events?.length ? input.events : DEFAULT_EVENTS;
    return this.db.$transaction(async (tx) => {
      if (input.isDefault) await tx.webhookEndpoint.updateMany({ where: { tenantId: user.tenantId }, data: { isDefault: false } });
      return tx.webhookEndpoint.create({ data: { tenantId: user.tenantId, name: input.name, url: input.url, secret: input.secret, events, isDefault: input.isDefault ?? false } });
    });
  }
  async remove(user: AuthUser, id: string) { const endpoint = await this.db.webhookEndpoint.findFirst({ where: { id, tenantId: user.tenantId } }); if (!endpoint) throw new NotFoundException('webhook_not_found'); return this.db.webhookEndpoint.delete({ where: { id } }); }
  async assign(user: AuthUser, instanceId: string, webhookEndpointId: string | null) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id: instanceId, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    if (webhookEndpointId) { const endpoint = await this.db.webhookEndpoint.findFirst({ where: { id: webhookEndpointId, tenantId: user.tenantId } }); if (!endpoint) throw new NotFoundException('webhook_not_found'); }
    const updated = await this.db.whatsappInstance.update({ where: { id: instanceId }, data: { webhookEndpointId } });
    await this.syncInstance(updated.id, user.tenantId);
    return updated;
  }
  async syncInstance(instanceId: string, tenantId: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id: instanceId, tenantId }, include: { webhookEndpoint: true } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const endpoint = instance.webhookEndpoint ?? await this.db.webhookEndpoint.findFirst({ where: { tenantId, isDefault: true, enabled: true } });
    const waha = wahaClient(instance.engine); const current = await waha.get(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`);
    const config = { ...(current.data?.config ?? {}), noweb: { markOnline: true }, webhooks: endpoint ? [{ url: endpoint.url, events: endpoint.events, ...(endpoint.secret ? { hmac: { key: endpoint.secret } } : {}) }] : [] };
    await waha.put(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`, { name: instance.wahaSession, config });
    return { instanceId, webhookEndpointId: endpoint?.id ?? null, url: endpoint?.url ?? null, events: endpoint?.events ?? [] };
  }
}
