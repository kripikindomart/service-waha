import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

@Injectable()
export class ContactGroupsService {
  constructor(private readonly db: PrismaService) {}

  list(user: AuthUser) {
    return this.db.contactGroup.findMany({
      where: { tenantId: user.tenantId },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(user: AuthUser, input: { name: string; description?: string; color?: string; contactIds?: string[] }) {
    const contactIds = Array.from(new Set(input.contactIds ?? []));
    const contacts = await this.db.contact.findMany({ where: { tenantId: user.tenantId, id: { in: contactIds } }, select: { id: true } });
    try {
      return await this.db.contactGroup.create({
        data: {
          tenantId: user.tenantId,
          name: input.name.trim(),
          description: input.description?.trim() || undefined,
          color: input.color || undefined,
          members: { create: contacts.map((contact) => ({ contactId: contact.id })) },
        },
        include: { _count: { select: { members: true } } },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('contact_group_already_exists');
      throw error;
    }
  }

  async updateMembers(user: AuthUser, id: string, contactIds: string[]) {
    const group = await this.db.contactGroup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!group) throw new NotFoundException('contact_group_not_found');
    const contacts = await this.db.contact.findMany({ where: { tenantId: user.tenantId, id: { in: Array.from(new Set(contactIds)) } }, select: { id: true } });
    await this.db.$transaction([
      this.db.contactGroupMember.deleteMany({ where: { groupId: id } }),
      this.db.contactGroupMember.createMany({ data: contacts.map((contact) => ({ groupId: id, contactId: contact.id })), skipDuplicates: true }),
    ]);
    return this.db.contactGroup.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
  }

  async remove(user: AuthUser, id: string) {
    const result = await this.db.contactGroup.deleteMany({ where: { id, tenantId: user.tenantId } });
    if (!result.count) throw new NotFoundException('contact_group_not_found');
    return { ok: true };
  }
}
