import { Body, Controller, Headers, Post } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';

@Controller('webhooks/waha')
export class WebhooksController {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  @Post()
  async receive(@Body() body: any, @Headers('x-webhook-signature') signature?: string) {
    const session = body?.session ?? body?.payload?.session;
    const event = body?.event ?? body?.eventName ?? 'unknown';
    if (!session) return { accepted: false, reason: 'missing_session' };
    const instance = await this.db.whatsappInstance.findUnique({ where: { wahaSession: session } });
    if (!instance) return { accepted: false, reason: 'unknown_session' };
    const eventKey = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const existing = await this.db.webhookEvent.findUnique({ where: { eventKey } });
    if (existing) return { accepted: true, duplicate: true };
    await this.db.webhookEvent.create({ data: { eventKey, tenantId: instance.tenantId, instanceId: instance.id, event, payload: body, processedAt: new Date() } });
    const payload = body?.payload ?? body?.data ?? body;
    const ack = payload?.ack ?? payload?.status;
    const messageId = payload?.id?._serialized ?? payload?.id;
    if (messageId && ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(String(ack).toUpperCase())) {
      await this.db.message.updateMany({ where: { tenantId: instance.tenantId, wahaMessageId: messageId }, data: { status: String(ack).toUpperCase() as any, rawPayload: body } });
    }
    const chatId = payload?.from ?? payload?.chatId ?? payload?.id?.remote;
    const text = payload?.body ?? payload?.text;
    if (chatId && text && event.toLowerCase().includes('message')) {
      const conversation = await this.db.conversation.upsert({ where: { instanceId_chatId: { instanceId: instance.id, chatId } }, update: {}, create: { tenantId: instance.tenantId, instanceId: instance.id, chatId } });
      await this.db.message.create({ data: { tenantId: instance.tenantId, conversationId: conversation.id, direction: 'INBOUND', status: 'DELIVERED', body: text, wahaMessageId: payload?.id?._serialized ?? payload?.id, rawPayload: body } });
    }
    await this.audit.logSystem(instance.tenantId, 'webhook.processed', instance.id, { event });
    return { accepted: true, duplicate: false };
  }
}
