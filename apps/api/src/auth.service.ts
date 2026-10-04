import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { compare, hash } from 'bcryptjs';

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
      return { user, tenant };
    });
    return this.issue(result.user.id, result.tenant.id, result.user.isSuperAdmin);
  }
  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() }, include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' }, take: 1 } } });
    if (!user || !(await compare(password, user.passwordHash)) || !user.memberships[0]) throw new UnauthorizedException('invalid_credentials');
    return this.issue(user.id, user.memberships[0].tenantId, user.isSuperAdmin);
  }
  private issue(userId: string, tenantId: string, isSuperAdmin: boolean) { return { accessToken: this.jwt.sign({ userId, tenantId, isSuperAdmin }), user: { id: userId, tenantId, isSuperAdmin } }; }
}
