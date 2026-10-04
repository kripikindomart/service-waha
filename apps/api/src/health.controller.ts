import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisService) {}
  @Get()
  async check() {
    return { status: 'ok', service: 'service-waha-api', redis: await this.redis.ping() };
  }
}
