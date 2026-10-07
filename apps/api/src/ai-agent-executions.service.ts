import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiAgentExecutionStatus, Prisma } from '@prisma/client';
import { AuthUser } from './auth.types';
import { FeatureFlagsService } from './feature-flags.service';
import { PrismaService } from './prisma.service';
import { tenantWhere } from './agent-namespace';

export type AiAgentExecutionQuery = {
  status?: string;
  agentId?: string;
  instanceId?: string;
  chatId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
};

@Injectable()
export class AiAgentExecutionsService {
  constructor(private readonly db: PrismaService, private readonly flags: FeatureFlagsService) {}

  async list(user: AuthUser, query: AiAgentExecutionQuery) {
    this.flags.assertAiAgentV2();
    const page = this.positiveInteger(query.page, 1, 10_000);
    const pageSize = this.positiveInteger(query.pageSize, 25, 100);
    const status = this.status(query.status);
    const createdAt = this.dateRange(query.from, query.to);
    const search = query.search?.trim().slice(0, 200);
    const where: Prisma.AiAgentExecutionWhereInput = tenantWhere(user, {
      ...(status ? { status } : {}),
      ...(query.agentId ? { agentId: query.agentId } : {}),
      ...(query.instanceId ? { instanceId: query.instanceId } : {}),
      ...(query.chatId ? { chatId: query.chatId.trim() } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search ? {
        OR: [
          { chatId: { contains: search, mode: 'insensitive' } },
          { inboundMessageId: { contains: search, mode: 'insensitive' } },
          { errorCode: { contains: search, mode: 'insensitive' } },
          { error: { contains: search, mode: 'insensitive' } },
          { agent: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    });
    const summaryWhere = { ...where };
    delete (summaryWhere as any).status;
    const [items, total] = await this.db.$transaction([
      this.db.aiAgentExecution.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, scope: true } },
          instance: { select: { id: true, name: true, engine: true } },
          aiProvider: { select: { id: true, name: true, prefix: true, protocol: true } },
          session: { select: { id: true, status: true, activatedBy: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.aiAgentExecution.count({ where }),
    ]);
    const grouped = await this.db.aiAgentExecution.groupBy({
      by: ['status'],
      where: summaryWhere,
      orderBy: { status: 'asc' },
      _count: { id: true },
    });
    const summary = Object.fromEntries(Object.values(AiAgentExecutionStatus).map((value) => [value, 0]));
    for (const item of grouped) summary[item.status] = item._count.id;
    return {
      items,
      summary,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async get(user: AuthUser, id: string) {
    this.flags.assertAiAgentV2();
    const execution = await this.db.aiAgentExecution.findFirst({
      where: tenantWhere(user, { id }),
      include: {
        agent: { select: { id: true, name: true, scope: true, activationMode: true, currentVersion: true } },
        instance: { select: { id: true, name: true, engine: true } },
        aiProvider: { select: { id: true, name: true, prefix: true, protocol: true } },
        session: { select: { id: true, status: true, activatedBy: true, activatedAt: true, lastActivityAt: true } },
      },
    });
    if (!execution) throw new NotFoundException('ai_agent_execution_not_found');
    const messages = await this.db.message.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { id: execution.outboundMessageId ?? '__none__' },
          { wahaMessageId: { in: [execution.inboundMessageId, execution.outboundMessageId ?? '__none__'] } },
        ],
      },
      select: { id: true, direction: true, status: true, body: true, wahaMessageId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return { ...execution, messages };
  }

  private status(value?: string) {
    if (!value) return undefined;
    if (!Object.values(AiAgentExecutionStatus).includes(value as AiAgentExecutionStatus)) {
      throw new BadRequestException('invalid_ai_agent_execution_status');
    }
    return value as AiAgentExecutionStatus;
  }

  private positiveInteger(value: string | undefined, fallback: number, max: number) {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) throw new BadRequestException('invalid_pagination');
    return Math.min(parsed, max);
  }

  private dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const gte = from ? new Date(from) : undefined;
    const lte = to ? new Date(to) : undefined;
    if ((gte && Number.isNaN(gte.getTime())) || (lte && Number.isNaN(lte.getTime())) || (gte && lte && gte > lte)) {
      throw new BadRequestException('invalid_date_range');
    }
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  }
}
