import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiAgentActivatedBy, AiAgentSessionStatus } from '@prisma/client';
import { AuthUser } from './auth.types';
import { FeatureFlagsService } from './feature-flags.service';
import { PrismaService } from './prisma.service';
import { tenantWhere } from './agent-namespace';
import { agentNamespace } from './agent-namespace';
import { RedisService } from './redis.service';

@Injectable()
export class AiAgentSessionsService {
  constructor(
    private readonly db: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly redis: RedisService,
  ) {}

  list(user: AuthUser, status?: AiAgentSessionStatus) {
    this.flags.assertAiAgentV2();
    if (status && !Object.values(AiAgentSessionStatus).includes(status)) {
      throw new BadRequestException('invalid_ai_agent_session_status');
    }
    return this.db.aiAgentSession.findMany({
      where: tenantWhere(user, status ? { status } : {}),
      include: {
        agent: { select: { id: true, name: true, scope: true, activationMode: true, enabled: true } },
        instance: { select: { id: true, name: true, engine: true } },
        handoffUser: { select: { id: true, name: true, email: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async get(user: AuthUser, id: string) {
    this.flags.assertAiAgentV2();
    const session = await this.db.aiAgentSession.findFirst({
      where: tenantWhere(user, { id }),
      include: {
        agent: { select: { id: true, name: true, scope: true, activationMode: true, enabled: true } },
        instance: { select: { id: true, name: true, engine: true } },
        handoffUser: { select: { id: true, name: true, email: true } },
        executions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!session) throw new NotFoundException('ai_agent_session_not_found');
    return session;
  }

  async resolveActive(tenantId: string, instanceId: string, chatId: string, participantId?: string | null) {
    const cacheKey = agentNamespace.sessionRoute(tenantId, instanceId, chatId, participantId);
    const cached = await this.redis.getJson<any>(cacheKey).catch(() => null);
    if (cached) {
      const hydrated = {
        ...cached,
        expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
        activatedAt: cached.activatedAt ? new Date(cached.activatedAt) : null,
        lastActivityAt: cached.lastActivityAt ? new Date(cached.lastActivityAt) : null,
        handedOffAt: cached.handedOffAt ? new Date(cached.handedOffAt) : null,
        closedAt: cached.closedAt ? new Date(cached.closedAt) : null,
      };
      if (hydrated.status === AiAgentSessionStatus.HANDED_OFF || !hydrated.expiresAt || hydrated.expiresAt > new Date()) {
        return hydrated;
      }
      await this.redis.delete(cacheKey).catch(() => undefined);
    }
    const candidates = await this.db.aiAgentSession.findMany({
      where: {
        tenantId,
        instanceId,
        chatId,
        status: { in: [AiAgentSessionStatus.ACTIVE, AiAgentSessionStatus.PAUSED, AiAgentSessionStatus.HANDED_OFF] },
        OR: [{ participantId: participantId || null }, { participantId: null }],
      },
      include: { agent: { include: { aiProvider: true } } },
      orderBy: { lastActivityAt: 'desc' },
      take: 5,
    });
    const now = new Date();
    for (const session of candidates) {
      if (session.status !== AiAgentSessionStatus.HANDED_OFF && session.expiresAt && session.expiresAt <= now) {
        await this.db.aiAgentSession.update({
          where: { id: session.id },
          data: { status: AiAgentSessionStatus.EXPIRED, activeScopeKey: null, closedAt: now },
        });
        continue;
      }
      const ttl = session.status === AiAgentSessionStatus.HANDED_OFF || !session.expiresAt
        ? 60
        : Math.min(60, Math.max(1, Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000)));
      await this.redis.setJson(cacheKey, session, ttl).catch(() => undefined);
      return session;
    }
    return null;
  }

  async activate(input: {
    tenantId: string;
    agentId: string;
    instanceId: string;
    chatId: string;
    participantId?: string | null;
    scopeKey: string;
    activatedBy: AiAgentActivatedBy;
    ttlSeconds: number;
  }) {
    const activeScopeKey = `${input.tenantId}:${input.instanceId}:${input.scopeKey}`;
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    try {
      return await this.db.aiAgentSession.create({
        data: {
          tenantId: input.tenantId,
          agentId: input.agentId,
          instanceId: input.instanceId,
          chatId: input.chatId,
          participantId: input.participantId || null,
          scopeKey: input.scopeKey,
          activeScopeKey,
          activatedBy: input.activatedBy,
          expiresAt,
        },
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      return this.db.aiAgentSession.findUniqueOrThrow({ where: { activeScopeKey } });
    }
  }

  async touch(session: { id: string; tenantId: string; instanceId: string; chatId: string; participantId?: string | null; expiresAt: Date | null }, ttlSeconds: number, extend: boolean) {
    const updated = await this.db.aiAgentSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
        ...(extend ? { expiresAt: new Date(Date.now() + ttlSeconds * 1000) } : {}),
      },
    });
    await this.invalidate(updated);
    return updated;
  }

  async close(id: string, status: AiAgentSessionStatus = AiAgentSessionStatus.CLOSED) {
    const updated = await this.db.aiAgentSession.update({
      where: { id },
      data: { status, activeScopeKey: null, closedAt: new Date() },
    });
    await this.invalidate(updated);
    return updated;
  }

  async pause(user: AuthUser, id: string) {
    await this.get(user, id);
    const updated = await this.db.aiAgentSession.update({ where: { id }, data: { status: AiAgentSessionStatus.PAUSED } });
    await this.invalidate(updated);
    return updated;
  }

  async resume(user: AuthUser, id: string) {
    const session = await this.get(user, id);
    const updated = await this.db.aiAgentSession.update({
      where: { id },
      data: {
        status: AiAgentSessionStatus.ACTIVE,
        activeScopeKey: `${user.tenantId}:${session.instanceId}:${session.scopeKey}`,
        handoffUserId: null,
        handedOffAt: null,
        closedAt: null,
        lastActivityAt: new Date(),
      },
    });
    await this.invalidate(updated);
    return updated;
  }

  async handoff(user: AuthUser, id: string) {
    await this.get(user, id);
    const updated = await this.db.aiAgentSession.update({
      where: { id },
      data: { status: AiAgentSessionStatus.HANDED_OFF, handoffUserId: user.userId, handedOffAt: new Date() },
    });
    await this.invalidate(updated);
    return updated;
  }

  async closeOwned(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.close(id);
  }

  async resetMemory(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.db.aiAgentSession.update({ where: { id }, data: { memorySummary: null } });
  }

  private invalidate(session: { tenantId: string; instanceId: string; chatId: string; participantId?: string | null }) {
    return this.redis.delete(agentNamespace.sessionRoute(session.tenantId, session.instanceId, session.chatId, session.participantId))
      .catch(() => undefined);
  }
}
