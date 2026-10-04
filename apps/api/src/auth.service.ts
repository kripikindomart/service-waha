import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { compare, hash } from 'bcryptjs';
import { CORE_PERMISSIONS } from './permissions';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService) {}
  async register(input: { email: string; password: string; name: string; tenantName: string }) {
    const email = input.email.toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new BadRequestException('email_already_registered');
    const slug = input.tenantName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `tenant-${Date.now()}`;
    const result = await this.db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, name: input.name, passwordHash: await hash(input.password, 12) } });
      const tenant = await tx.tenant.create({ data: { name: input.tenantName, slug } });
      const member = await tx.tenantMember.create({ data: { userId: user.id, tenantId: tenant.id } });
      const role = await tx.role.create({ data: { tenantId: tenant.id, name: 'owner', description: 'Tenant owner' } });
      await tx.memberRole.create({ data: { memberId: member.id, roleId: role.id } });
      for (const key of CORE_PERMISSIONS) {
        const permission = await tx.permission.upsert({ where: { key }, update: {}, create: { key } });
        await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      }
      return { user, tenant };
    });
    return this.issue(result.user.id, result.tenant.id, result.user.isSuperAdmin);
  }
  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() }, include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' }, take: 1 } } });
    if (!user || !(await compare(password, user.passwordHash)) || !user.memberships[0]) throw new UnauthorizedException('invalid_credentials');
    return this.issue(user.id, user.memberships[0].tenantId, user.isSuperAdmin);
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.db.refreshToken.findUnique({ where: { tokenHash }, include: { user: { include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' }, take: 1 } } } } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !stored.user.memberships[0]) throw new UnauthorizedException('invalid_refresh_token');
    await this.db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issue(stored.user.id, stored.user.memberships[0].tenantId, stored.user.isSuperAdmin);
  }

  async revoke(rawToken: string) { await this.db.refreshToken.updateMany({ where: { tokenHash: this.hashToken(rawToken), revokedAt: null }, data: { revokedAt: new Date() } }); return { ok: true }; }

  private async issue(userId: string, tenantId: string, isSuperAdmin: boolean) {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.refreshToken.create({ data: { tokenHash: this.hashToken(refreshToken), userId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    return { accessToken: this.jwt.sign({ userId, tenantId, isSuperAdmin }), refreshToken, user: { id: userId, tenantId, isSuperAdmin } };
  }

  private hashToken(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
