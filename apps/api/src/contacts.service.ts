import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';
import { wahaClient } from './waha.client';

export function normalizePhone(value: string) { return value.trim().replace(/[^0-9+]/g, '').replace(/^\+/, ''); }

@Injectable()
export class ContactsService {
  constructor(private readonly db: PrismaService) {}
  list(user: AuthUser, query?: string) { const q = query?.trim(); return this.db.contact.findMany({ where: { tenantId: user.tenantId, ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, { email: { contains: q, mode: 'insensitive' } }] } : {}) }, orderBy: [{ name: 'asc' }, { createdAt: 'desc' }] }); }
  async create(user: AuthUser, input: { name: string; phone: string; email?: string; company?: string; notes?: string; tags?: string[] }) { const phone = normalizePhone(input.phone); try { return await this.db.contact.create({ data: { tenantId: user.tenantId, name: input.name.trim(), phone, email: input.email?.trim() || undefined, company: input.company?.trim() || undefined, notes: input.notes?.trim() || undefined, tags: input.tags ?? [] } }); } catch (error: any) { if (error?.code === 'P2002') throw new ConflictException('contact_phone_already_exists'); throw error; } }
  async importFromWaha(user: AuthUser, instanceId: string, source: 'contacts' | 'groups') {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id: instanceId, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    try {
      if (source === 'contacts') return this.importContacts(user, instance);
      return this.importGroups(user, instance);
    } catch (error: any) {
      const detail = error?.response?.data?.message ?? error?.message ?? 'waha_import_failed';
      throw new BadRequestException(detail);
    }
  }
  async previewFromWaha(user: AuthUser, instanceId: string, source: 'contacts' | 'groups') {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id: instanceId, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    try {
      await this.enableStore(instance);
      const contacts = source === 'contacts' ? await this.fetchContacts(instance) : await this.fetchGroupParticipants(instance);
      const existing = await this.db.contact.findMany({ where: { tenantId: user.tenantId, phone: { in: contacts.map((item: any) => item.phone) } }, select: { phone: true, name: true } });
      const existingPhones = new Set(existing.map((item) => item.phone));
      return { source, total: contacts.length, newCount: contacts.filter((item: any) => !existingPhones.has(item.phone)).length, existingCount: contacts.filter((item: any) => existingPhones.has(item.phone)).length, contacts: contacts.map((item: any) => ({ ...item, alreadyExists: existingPhones.has(item.phone) })) };
    } catch (error: any) {
      const detail = error?.response?.data?.message ?? error?.message ?? 'waha_import_failed';
      throw new BadRequestException(detail);
    }
  }
  async commitPreview(user: AuthUser, instanceId: string, source: 'contacts' | 'groups', contacts: Array<{ phone: string; wahaId?: string; name?: string; groupId?: string; groupName?: string }>) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id: instanceId, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    let imported = 0;
    for (const item of contacts) {
      const phone = normalizePhone(String(item.phone ?? ''));
      if (!phone) continue;
      await this.upsertImported(user, instance, { phone, wahaId: String(item.wahaId ?? `${phone}@c.us`), name: item.name?.trim() || phone, source, groupId: item.groupId, groupName: item.groupName });
      imported++;
    }
    return { source, imported };
  }
  private async importContacts(user: AuthUser, instance: any) {
    await this.enableStore(instance);
    const items = await this.fetchContacts(instance);
    let imported = 0;
    for (const item of items) { await this.upsertImported(user, instance, { ...item, source: 'whatsapp' }); imported++; }
    return { source: 'contacts', imported };
  }
  private async importGroups(user: AuthUser, instance: any) {
    await this.enableStore(instance);
    const groups = await this.fetchGroupParticipants(instance);
    let imported = 0;
    for (const item of groups) { await this.upsertImported(user, instance, { ...item, source: 'group' }); imported++; }
    return { source: 'groups', imported, groups: new Set(groups.map((item) => item.groupId)).size };
  }
  private async fetchContacts(instance: any) {
    const response = await wahaClient(instance.engine).get('/api/contacts/all', { params: { session: instance.wahaSession, limit: 1000, offset: 0 } });
    const items = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
    return items.map((item: any) => { const wahaId = String(item.id ?? item.chatId ?? item._serialized ?? ''); const phone = normalizePhone(wahaId.split('@')[0]); return { phone, wahaId, name: item.name ?? item.pushname ?? item.pushName ?? phone }; }).filter((item: any) => item.phone);
  }
  private async fetchGroupParticipants(instance: any) {
    const response = await wahaClient(instance.engine).get(`/api/${encodeURIComponent(instance.wahaSession)}/groups`, { params: { limit: 1000, offset: 0 } });
    const groups = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
    const result: any[] = [];
    const waha = wahaClient(instance.engine); for (const group of groups) { const groupId = String(group.id ?? group.groupId ?? ''); if (!groupId) continue; const participantsResponse = await waha.get(`/api/${encodeURIComponent(instance.wahaSession)}/groups/${encodeURIComponent(groupId)}/participants/v2`); const participants = Array.isArray(participantsResponse.data) ? participantsResponse.data : participantsResponse.data?.data ?? participantsResponse.data?.participants ?? []; for (const participant of participants) { const rawId = typeof participant === 'string' ? participant : participant.id ?? participant.phone ?? participant.jid; const phone = normalizePhone(String(rawId ?? '').split('@')[0]); if (phone) result.push({ phone, wahaId: String(rawId), name: participant.name ?? participant.pushName ?? phone, groupId, groupName: group.subject ?? group.name ?? groupId }); } }
    return Array.from(new Map(result.map((item) => [item.phone, item])).values());
  }
  private async enableStore(instance: any) { const waha = wahaClient(instance.engine); const current = await waha.get(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`); const config = instance.engine === 'GOWS' ? { ...(current.data?.config ?? {}), gows: { ...(current.data?.config?.gows ?? {}), storage: { messages: true, groups: true, chats: true, contacts: true, labels: true } } } : { ...(current.data?.config ?? {}), noweb: { ...(current.data?.config?.noweb ?? {}), store: { enabled: true, fullSync: true } } }; await waha.put(`/api/sessions/${encodeURIComponent(instance.wahaSession)}`, { name: instance.wahaSession, config }); }
  private async upsertImported(user: AuthUser, instance: any, input: { phone: string; wahaId: string; name: string; source: string; groupId?: string; groupName?: string }) { const existing = await this.db.contact.findUnique({ where: { tenantId_phone: { tenantId: user.tenantId, phone: input.phone } } }); const tags = Array.from(new Set([...(existing?.tags ?? []), input.groupName ? `group:${input.groupName}` : 'whatsapp'])); return this.db.contact.upsert({ where: { tenantId_phone: { tenantId: user.tenantId, phone: input.phone } }, update: { name: existing?.name && existing.source === 'manual' ? existing.name : input.name, wahaId: input.wahaId, source: existing?.source === 'manual' ? 'manual' : input.source, groupId: input.groupId, groupName: input.groupName, sourceInstanceId: instance.id, tags }, create: { tenantId: user.tenantId, name: input.name, phone: input.phone, wahaId: input.wahaId, source: input.source, groupId: input.groupId, groupName: input.groupName, sourceInstanceId: instance.id, tags } }); }
  async update(user: AuthUser, id: string, input: Partial<{ name: string; phone: string; email: string; company: string; notes: string; tags: string[] }>) { const existing = await this.db.contact.findFirst({ where: { id, tenantId: user.tenantId } }); if (!existing) throw new NotFoundException('contact_not_found'); try { return await this.db.contact.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}), ...(input.email !== undefined ? { email: input.email.trim() || null } : {}), ...(input.company !== undefined ? { company: input.company.trim() || null } : {}), ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}), ...(input.tags !== undefined ? { tags: input.tags } : {}) } }); } catch (error: any) { if (error?.code === 'P2002') throw new ConflictException('contact_phone_already_exists'); throw error; } }
  async remove(user: AuthUser, id: string) { const result = await this.db.contact.deleteMany({ where: { id, tenantId: user.tenantId } }); if (!result.count) throw new NotFoundException('contact_not_found'); return { ok: true }; }
}
