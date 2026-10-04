import 'dotenv/config';
import rateLimit from '@fastify/rate-limit';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute', keyGenerator: (request) => String(request.headers['x-api-key'] ?? request.ip) });
  app.enableCors({ origin: true, credentials: true, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] });
  await app.listen(Number(process.env.API_PORT ?? 8081), process.env.API_HOST ?? '0.0.0.0');
}
bootstrap();
