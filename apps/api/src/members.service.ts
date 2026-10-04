import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

@Injectable()
export class MembersService {
  constructor(private readonly db: PrismaService) {}

  list(user: AuthUser) {
    return this.db.tenantMember.findMany({ where: { tenantId: user.tenantId }, include: { user: { select: { id: true, email: true, name: true, createdAt: true } }, roles: { include: { role: { select: { id: true, name: true, description: true } } } } }, orderBy: { createdAt: 'asc' } });
  }

  async add(user: AuthUser, email: string, roleId: string) {
    const target = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!target) throw new NotFoundException('user_not_found');
    const role = await this.db.role.findFirst({ where: { id: roleId, tenantId: user.tenantId } });
    if (!role) throw new NotFoundException('role_not_found');
    const member = await this.db.tenantMember.upsert({ where: { tenantId_userId: { tenantId: user.tenantId, userId: target.id } }, update: { status: 'ACTIVE' }, create: { tenantId: user.tenantId, userId: target.id } });
    await this.db.memberRole.upsert({ where: { memberId_roleId: { memberId: member.id, roleId } }, update: {}, create: { memberId: member.id, roleId } });
    return this.db.tenantMember.findUnique({ where: { id: member.id }, include: { user: { select: { id: true, email: true, name: true } }, roles: { include: { role: true } } } });
  }

  async setStatus(user: AuthUser, memberId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const member = await this.db.tenantMember.findFirst({ where: { id: memberId, tenantId: user.tenantId } });
    if (!member) throw new NotFoundException('member_not_found');
    if (member.userId === user.userId) throw new BadRequestException('cannot_change_own_status');
    return this.db.tenantMember.update({ where: { id: memberId }, data: { status } });
  }
}
