import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

@Injectable()
export class AuditService {
  constructor(private readonly db: PrismaService) {}
  log(user: Pick<AuthUser, 'tenantId' | 'userId'> | undefined, action: string, resource?: string, metadata?: unknown) {
    return this.db.auditLog.create({ data: { tenantId: user?.tenantId, userId: user?.userId, action, resource, metadata: metadata as any } });
  }
  logSystem(tenantId: string, action: string, resource?: string, metadata?: unknown) {
    return this.db.auditLog.create({ data: { tenantId, action, resource, metadata: metadata as any } });
  }
  list(user: AuthUser) { return this.db.auditLog.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 200 }); }
}
