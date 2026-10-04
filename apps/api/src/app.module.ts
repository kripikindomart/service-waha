import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { RedisService } from './redis.service';
import { PermissionGuard } from './permission.guard';
import { BullModule } from '@nestjs/bullmq';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesProcessor } from './messages.processor';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'change-me', signOptions: { expiresIn: '12h' } }), BullModule.forRoot({ connection: { url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379' } }), BullModule.registerQueue({ name: 'messages' })],
  controllers: [HealthController, AuthController, InstancesController, MessagesController, WebhooksController],
  providers: [PrismaService, AuthService, InstancesService, RedisService, PermissionGuard, MessagesService, MessagesProcessor],
})
export class AppModule {}
