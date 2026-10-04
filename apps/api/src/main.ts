import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors({ origin: true, credentials: true });
  await app.listen(Number(process.env.API_PORT ?? 8081), process.env.API_HOST ?? '0.0.0.0');
}
bootstrap();
