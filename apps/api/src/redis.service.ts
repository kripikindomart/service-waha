import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });

  async ping() {
    try {
      if (this.client.status === 'wait') await this.client.connect();
      return (await this.client.ping()) === 'PONG' ? 'ok' : 'degraded';
    } catch { return 'degraded'; }
  }

  async onModuleDestroy() { await this.client.quit().catch(() => undefined); }
}
