import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { PERMISSIONS_KEY } from './permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (!required.length) return true;
    const user = context.switchToHttp().getRequest().user;
    if (user?.authType === 'apiKey') {
      const granted = new Set<string>(user.permissions ?? []);
      if (required.every((permission) => granted.has(permission))) return true;
      throw new ForbiddenException('api_key_missing_permission');
    }
    if (user?.isSuperAdmin) return true;
    const member = await this.db.tenantMember.findUnique({ where: { tenantId_userId: { tenantId: user.tenantId, userId: user.userId } }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    const granted = new Set(member?.roles.flatMap((item) => item.role.permissions.map((item) => item.permission.key)) ?? []);
    if (required.every((permission) => granted.has(permission))) return true;
    throw new ForbiddenException('missing_permission');
  }
}
