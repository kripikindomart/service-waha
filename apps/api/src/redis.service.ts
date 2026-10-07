import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });

  async ping() {
    try {
      if (this.client.status === 'wait') await this.client.connect();
      return (await this.client.ping()) === 'PONG' ? 'ok' : 'degraded';
    } catch { return 'degraded'; }
  }

  async acquireLock(key: string, ttlMs = 30_000) {
    if (this.client.status === 'wait') await this.client.connect();
    const token = randomUUID();
    const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string) {
    if (this.client.status === 'wait') await this.client.connect();
    await this.client.eval(
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
      1,
      key,
      token,
    );
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (this.client.status === 'wait') await this.client.connect();
    const value = await this.client.get(key);
    if (!value) return null;
    try { return JSON.parse(value) as T; }
    catch { await this.client.del(key); return null; }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    if (this.client.status === 'wait') await this.client.connect();
    await this.client.set(key, JSON.stringify(value), 'EX', Math.max(1, Math.floor(ttlSeconds)));
  }

  async delete(key: string) {
    if (this.client.status === 'wait') await this.client.connect();
    await this.client.del(key);
  }

  async onModuleDestroy() { await this.client.quit().catch(() => undefined); }
}
