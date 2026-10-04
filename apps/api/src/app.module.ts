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
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { WebhooksConfigController } from './webhooks-config.controller';
import { WebhooksService } from './webhooks.service';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'change-me', signOptions: { expiresIn: '12h' } }), BullModule.forRoot({ connection: { url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379' } }), BullModule.registerQueue({ name: 'messages' })],
  controllers: [HealthController, AuthController, InstancesController, MessagesController, ConversationsController, WebhooksController, WebhooksConfigController, ContactsController, MembersController, RolesController, AuditController],
  providers: [PrismaService, AuthService, InstancesService, RedisService, PermissionGuard, MessagesService, MessagesProcessor, ConversationsService, WebhooksService, ContactsService, MembersService, RolesService, AuditService],
})
export class AppModule {}
