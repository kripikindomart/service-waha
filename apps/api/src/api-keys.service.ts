import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AuthUser } from './auth.types';
import { AuditService } from './audit.service';
import { CORE_PERMISSIONS } from './permissions';
import { PrismaService } from './prisma.service';

@Injectable()
export class ApiKeysService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  list(user: AuthUser) {
    return this.db.apiKey.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true, name: true, prefix: true, permissions: true, expiresAt: true,
        lastUsedAt: true, revokedAt: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: AuthUser, input: { name: string; permissions: string[]; expiresAt?: string }) {
    const allowed = new Set<string>(CORE_PERMISSIONS);
    const permissions = [...new Set(input.permissions)].filter((permission) => allowed.has(permission));
    if (!permissions.length) throw new BadRequestException('api_key_permissions_required');
    if (permissions.length !== new Set(input.permissions).size) throw new BadRequestException('invalid_api_key_permission');

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) {
      throw new BadRequestException('invalid_api_key_expiry');
    }

    const plainKey = `wag_live_${randomBytes(32).toString('base64url')}`;
    const keyHash = createHash('sha256').update(plainKey).digest('hex');
    const apiKey = await this.db.apiKey.create({
      data: {
        tenantId: user.tenantId,
        createdByUserId: user.userId,
        name: input.name.trim(),
        prefix: plainKey.slice(0, 17),
        keyHash,
        permissions,
        expiresAt,
      },
      select: {
        id: true, name: true, prefix: true, permissions: true, expiresAt: true,
        lastUsedAt: true, revokedAt: true, createdAt: true,
      },
    });
    await this.audit.log(user, 'api_key.created', apiKey.id, { name: apiKey.name, permissions });
    return { ...apiKey, plainKey };
  }

  async revoke(user: AuthUser, id: string) {
    const apiKey = await this.db.apiKey.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!apiKey) throw new NotFoundException('api_key_not_found');
    if (!apiKey.revokedAt) {
      await this.db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
      await this.audit.log(user, 'api_key.revoked', id, { name: apiKey.name });
    }
    return { ok: true };
  }
}
