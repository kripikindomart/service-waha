import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const CORE_PERMISSIONS = [
  'instance.read', 'instance.create', 'instance.control',
  'member.read', 'member.create', 'member.update',
  'role.read', 'role.manage', 'message.read', 'message.send', 'audit.read',
] as const;
