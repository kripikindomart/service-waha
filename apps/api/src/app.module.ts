import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { InstancesController } from "./instances.controller";
import { InstancesService } from "./instances.service";
import { RedisService } from "./redis.service";
import { PermissionGuard } from "./permission.guard";
import { BullModule } from "@nestjs/bullmq";
import { MessagesService } from "./messages.service";
import { MessagesController } from "./messages.controller";
import { MessagesProcessor } from "./messages.processor";
import { WebhooksController } from "./webhooks.controller";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { WebhooksConfigController } from "./webhooks-config.controller";
import { WebhooksService } from "./webhooks.service";
import { ContactsController } from "./contacts.controller";
import { ContactsService } from "./contacts.service";
import { ContactGroupsController } from "./contact-groups.controller";
import { ContactGroupsService } from "./contact-groups.service";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { CampaignsProcessor } from "./campaigns.processor";
import { DataSheetsController } from "./data-sheets.controller";
import { DataSheetsService } from "./data-sheets.service";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";
import { AiProvidersController } from "./ai-providers.controller";
import { AiProvidersService } from "./ai-providers.service";
import { FeatureFlagsService } from "./feature-flags.service";
import { AiAgentsController } from "./ai-agents.controller";
import { AiAgentsService } from "./ai-agents.service";
import { AiAgentSessionsService } from "./ai-agent-sessions.service";
import { AiAgentRouterService } from "./ai-agent-router.service";
import { AiAgentProcessor } from "./ai-agent.processor";
import { AiAgentSessionsController } from "./ai-agent-sessions.controller";
import { AiAgentExecutionsController } from "./ai-agent-executions.controller";
import { AiAgentExecutionsService } from "./ai-agent-executions.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "change-me",
      signOptions: { expiresIn: "12h" },
    }),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379" },
    }),
    BullModule.registerQueue({ name: "messages" }),
    BullModule.registerQueue({ name: "broadcasts" }),
    BullModule.registerQueue({ name: "ai-agent-execution" }),
  ],
  controllers: [
    HealthController,
    AuthController,
    InstancesController,
    MessagesController,
    ConversationsController,
    WebhooksController,
    WebhooksConfigController,
    ContactsController,
    ContactGroupsController,
    CampaignsController,
    DataSheetsController,
    MembersController,
    RolesController,
    AuditController,
    ApiKeysController,
    AutomationsController,
    AiProvidersController,
    AiAgentsController,
    AiAgentSessionsController,
    AiAgentExecutionsController,
  ],
  providers: [
    PrismaService,
    AuthService,
    InstancesService,
    RedisService,
    PermissionGuard,
    MessagesService,
    MessagesProcessor,
    CampaignsProcessor,
    ConversationsService,
    WebhooksService,
    ContactsService,
    ContactGroupsService,
    CampaignsService,
    DataSheetsService,
    MembersService,
    RolesService,
    AuditService,
    ApiKeysService,
    AutomationsService,
    AiProvidersService,
    FeatureFlagsService,
    AiAgentsService,
    AiAgentSessionsService,
    AiAgentRouterService,
    AiAgentProcessor,
    AiAgentExecutionsService,
  ],
})
export class AppModule {}
