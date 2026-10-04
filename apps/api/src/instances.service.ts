import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';
import { AuditService } from './audit.service';

@Injectable()
export class InstancesService {
  private readonly waha = axios.create({ baseURL: process.env.WAHA_BASE_URL ?? 'http://127.0.0.1:3000', headers: { 'X-Api-Key': process.env.WAHA_API_KEY ?? '' }, timeout: 15000 });
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}
  list(user: AuthUser) { return this.db.whatsappInstance.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } }); }
  async create(user: AuthUser, name: string) {
    const defaultWebhook = await this.db.webhookEndpoint.findFirst({ where: { tenantId: user.tenantId, isDefault: true, enabled: true } });
    const instance = await this.db.whatsappInstance.create({ data: { tenantId: user.tenantId, name, wahaSession: `${user.tenantId}-${name}`, webhookEndpointId: defaultWebhook?.id } });
    const webhookUrl = defaultWebhook?.url ?? process.env.WAHA_WEBHOOK_URL;
    const webhookEvents = defaultWebhook?.events ?? ['message', 'message.any', 'message.ack', 'session.status'];
    const config = { noweb: { markOnline: true }, ...(webhookUrl ? { webhooks: [{ url: webhookUrl, events: webhookEvents, ...(defaultWebhook?.secret ? { hmac: { key: defaultWebhook.secret } } : {}) }] } : {}) };
    await this.waha.post('/api/sessions', { name: instance.wahaSession, config });
    await this.audit.log(user, 'instance.create', instance.id, { name });
    return instance;
  }
  start(user: AuthUser, id: string) { return this.control(user, id, 'start'); }
  stop(user: AuthUser, id: string) { return this.control(user, id, 'stop'); }
  async remove(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    try { await this.waha.delete(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`); } catch (error) { if (axios.isAxiosError(error) && error.response && error.response.status !== 404) throw error; }
    await this.audit.log(user, 'instance.delete', id, { name: instance.name });
    return this.db.whatsappInstance.delete({ where: { id } });
  }
  async status(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const response = await this.waha.get(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`);
    const status = String(response.data?.status ?? '').toUpperCase();
    const mapped = status.includes('WORK') ? 'WORKING' : status.includes('START') || status.includes('SCAN_QR') || status.includes('AUTHENTICAT') ? 'STARTING' : status.includes('STOP') ? 'STOPPED' : status.includes('FAIL') ? 'FAILED' : instance.status;
    if (mapped !== instance.status) await this.db.whatsappInstance.update({ where: { id }, data: { status: mapped as any } });
    return response.data;
  }
  async qr(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const session = await this.waha.get(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`);
    const status = String(session.data?.status ?? '').toUpperCase();
    if (status !== 'SCAN_QR_CODE') throw new BadRequestException(`QR belum tersedia. Status session: ${status || 'UNKNOWN'}`);
    const response = await this.waha.get(`/api/${encodeURIComponent(instance.wahaSession)}/auth/qr`, { responseType: 'arraybuffer' });
    return { data: response.data, contentType: response.headers['content-type'] ?? 'image/png' };
  }
  private async control(user: AuthUser, id: string, action: 'start' | 'stop') {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const response = await this.waha.post(`/api/sessions/${encodeURIComponent(instance.wahaSession)}/${action}`, {});
    const wahaStatus = String(response.data?.status ?? '').toUpperCase();
    await this.db.whatsappInstance.update({ where: { id }, data: { status: action === 'start' && wahaStatus.includes('FAIL') ? 'FAILED' : action === 'start' ? 'STARTING' : 'STOPPED' } });
    await this.audit.log(user, `instance.${action}`, id);
    return response.data;
  }
}
