import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';
import { CORE_PERMISSIONS } from './permissions';

@Injectable()
export class RolesService {
  constructor(private readonly db: PrismaService) {}
  list(user: AuthUser) { return this.db.role.findMany({ where: { tenantId: user.tenantId }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } }); }
  async create(user: AuthUser, name: string, permissions: string[]) {
    const keys = permissions.filter((key) => (CORE_PERMISSIONS as readonly string[]).includes(key));
    return this.db.$transaction(async (tx) => {
      const role = await tx.role.create({ data: { tenantId: user.tenantId, name } });
      for (const key of keys) {
        const permission = await tx.permission.upsert({ where: { key }, update: {}, create: { key } });
        await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      }
      return tx.role.findUnique({ where: { id: role.id }, include: { permissions: { include: { permission: true } } } });
    });
  }
}
