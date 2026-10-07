import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { AuthUser } from './auth.types';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    const headerApiKey = request.headers['x-api-key'];
    const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const rawApiKey = String(headerApiKey ?? (bearer.startsWith('wag_') ? bearer : '')).trim();

    if (rawApiKey) {
      const keyHash = createHash('sha256').update(rawApiKey).digest('hex');
      const apiKey = await this.db.apiKey.findUnique({ where: { keyHash } });
      if (!apiKey || apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt <= new Date())) {
        throw new UnauthorizedException('invalid_api_key');
      }
      request.user = {
        userId: apiKey.createdByUserId,
        tenantId: apiKey.tenantId,
        isSuperAdmin: false,
        authType: 'apiKey',
        apiKeyId: apiKey.id,
        permissions: apiKey.permissions,
      } satisfies AuthUser;
      if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 60_000) {
        await this.db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
      }
      return true;
    }

    if (!bearer) throw new UnauthorizedException();
    try { request.user = { ...this.jwt.verify<AuthUser>(bearer), authType: 'jwt' }; return true; }
    catch { throw new UnauthorizedException(); }
  }
}
