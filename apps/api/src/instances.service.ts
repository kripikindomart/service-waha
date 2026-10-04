import { Injectable, NotFoundException } from '@nestjs/common';
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
    const instance = await this.db.whatsappInstance.create({ data: { tenantId: user.tenantId, name, wahaSession: `${user.tenantId}-${name}` } });
    await this.waha.post('/api/sessions', { name: instance.wahaSession });
    await this.audit.log(user, 'instance.create', instance.id, { name });
    return instance;
  }
  start(user: AuthUser, id: string) { return this.control(user, id, 'start'); }
  stop(user: AuthUser, id: string) { return this.control(user, id, 'stop'); }
  async status(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const response = await this.waha.get(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`);
    const status = String(response.data?.status ?? '').toUpperCase();
    const mapped = status.includes('WORK') ? 'WORKING' : status.includes('START') ? 'STARTING' : status.includes('STOP') ? 'STOPPED' : instance.status;
    if (mapped !== instance.status) await this.db.whatsappInstance.update({ where: { id }, data: { status: mapped as any } });
    return response.data;
  }
  async qr(user: AuthUser, id: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const response = await this.waha.get(`/api/${encodeURIComponent(instance.wahaSession)}/auth/qr`);
    return response.data;
  }
  private async control(user: AuthUser, id: string, action: 'start' | 'stop') {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const response = await this.waha.post(`/api/sessions/${encodeURIComponent(instance.wahaSession)}/${action}`, {});
    await this.db.whatsappInstance.update({ where: { id }, data: { status: action === 'start' ? 'STARTING' : 'STOPPED' } });
    await this.audit.log(user, `instance.${action}`, id);
    return response.data;
  }
}
