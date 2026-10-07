import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const CORE_PERMISSIONS = [
  'instance.read', 'instance.create', 'instance.control',
  'member.read', 'member.create', 'member.update',
  'role.read', 'role.manage', 'message.read', 'message.send', 'contact.read', 'contact.manage', 'audit.read',
  'api-key.read', 'api-key.manage',
  'ai-agent.read', 'ai-agent.manage', 'ai-agent.execute',
  'agent-knowledge.read', 'agent-knowledge.manage',
  'ai-agent-session.read', 'ai-agent-session.manage',
  'ai-agent-execution.read',
] as const;
