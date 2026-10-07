import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey() {
  const secret = process.env.AI_CREDENTIALS_SECRET ?? process.env.JWT_SECRET ?? 'change-me';
  return createHash('sha256').update(secret).digest();
}

export function encryptCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    encryptedKey: encrypted.toString('base64url'),
    encryptionIv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
  };
}

export function decryptCredential(input: { encryptedKey: string; encryptionIv: string; authTag: string }) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(input.encryptionIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(input.authTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(input.encryptedKey, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function credentialHint(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}...${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}
