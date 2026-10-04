import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

export function normalizePhone(value: string) { return value.trim().replace(/[^0-9+]/g, '').replace(/^\+/, ''); }

@Injectable()
export class ContactsService {
  constructor(private readonly db: PrismaService) {}
  list(user: AuthUser, query?: string) { const q = query?.trim(); return this.db.contact.findMany({ where: { tenantId: user.tenantId, ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, { email: { contains: q, mode: 'insensitive' } }] } : {}) }, orderBy: [{ name: 'asc' }, { createdAt: 'desc' }] }); }
  async create(user: AuthUser, input: { name: string; phone: string; email?: string; company?: string; notes?: string; tags?: string[] }) { const phone = normalizePhone(input.phone); try { return await this.db.contact.create({ data: { tenantId: user.tenantId, name: input.name.trim(), phone, email: input.email?.trim() || undefined, company: input.company?.trim() || undefined, notes: input.notes?.trim() || undefined, tags: input.tags ?? [] } }); } catch (error: any) { if (error?.code === 'P2002') throw new ConflictException('contact_phone_already_exists'); throw error; } }
  async update(user: AuthUser, id: string, input: Partial<{ name: string; phone: string; email: string; company: string; notes: string; tags: string[] }>) { const existing = await this.db.contact.findFirst({ where: { id, tenantId: user.tenantId } }); if (!existing) throw new NotFoundException('contact_not_found'); try { return await this.db.contact.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}), ...(input.email !== undefined ? { email: input.email.trim() || null } : {}), ...(input.company !== undefined ? { company: input.company.trim() || null } : {}), ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}), ...(input.tags !== undefined ? { tags: input.tags } : {}) } }); } catch (error: any) { if (error?.code === 'P2002') throw new ConflictException('contact_phone_already_exists'); throw error; } }
  async remove(user: AuthUser, id: string) { const result = await this.db.contact.deleteMany({ where: { id, tenantId: user.tenantId } }); if (!result.count) throw new NotFoundException('contact_not_found'); return { ok: true }; }
}
