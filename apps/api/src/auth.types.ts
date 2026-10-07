export type AuthUser = {
  userId: string;
  tenantId: string;
  isSuperAdmin: boolean;
  authType?: 'jwt' | 'apiKey';
  apiKeyId?: string;
  permissions?: string[];
};
