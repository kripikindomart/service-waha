import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from './auth.types';

type TenantOwned = { tenantId: string };

export function tenantWhere<T extends object>(user: AuthUser, where?: T): T & { tenantId: string } {
  if (!user?.tenantId) throw new ForbiddenException('tenant_context_required');
  return { ...(where ?? {} as T), tenantId: user.tenantId };
}

export function assertTenantOwnership(user: AuthUser, resource: TenantOwned | null | undefined) {
  if (!resource || resource.tenantId !== user.tenantId) throw new ForbiddenException('tenant_resource_forbidden');
  return resource;
}

function segment(value: string) {
  return encodeURIComponent(value.trim());
}

export const agentNamespace = {
  session: (tenantId: string, agentId: string, instanceId: string, scopeKey: string) =>
    `agent:session:${segment(tenantId)}:${segment(agentId)}:${segment(instanceId)}:${segment(scopeKey)}`,
  sessionRoute: (tenantId: string, instanceId: string, chatId: string, participantId?: string | null) =>
    `agent:session-route:${segment(tenantId)}:${segment(instanceId)}:${segment(chatId)}:${segment(participantId || '-')}`,
  memory: (tenantId: string, agentId: string, sessionId: string) =>
    `agent:memory:${segment(tenantId)}:${segment(agentId)}:${segment(sessionId)}`,
  lock: (tenantId: string, inboundMessageId: string) =>
    `agent:lock:${segment(tenantId)}:${segment(inboundMessageId)}`,
  knowledgeCache: (tenantId: string, sourceId: string, version: number) =>
    `knowledge:cache:${segment(tenantId)}:${segment(sourceId)}:${version}`,
  filePrefix: (tenantId: string, agentId: string) =>
    `tenants/${segment(tenantId)}/agents/${segment(agentId)}/knowledge`,
};
