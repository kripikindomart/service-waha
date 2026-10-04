import { Body, Controller, Headers, Post } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';

@Controller('webhooks/waha')
export class WebhooksController {
  constructor(private readonly db: PrismaService) {}

  @Post()
  async receive(@Body() body: any, @Headers('x-webhook-signature') signature?: string) {
    const session = body?.session ?? body?.payload?.session;
    const event = body?.event ?? body?.eventName ?? 'unknown';
    if (!session) return { accepted: false, reason: 'missing_session' };
    const instance = await this.db.whatsappInstance.findUnique({ where: { wahaSession: session } });
    if (!instance) return { accepted: false, reason: 'unknown_session' };
    const eventKey = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const stored = await this.db.webhookEvent.upsert({ where: { eventKey }, update: {}, create: { eventKey, tenantId: instance.tenantId, instanceId: instance.id, event, payload: body, processedAt: new Date() } });
    const payload = body?.payload ?? body?.data ?? body;
    const chatId = payload?.from ?? payload?.chatId ?? payload?.id?.remote;
    const text = payload?.body ?? payload?.text;
    if (chatId && text && event.toLowerCase().includes('message')) {
      const conversation = await this.db.conversation.upsert({ where: { instanceId_chatId: { instanceId: instance.id, chatId } }, update: {}, create: { tenantId: instance.tenantId, instanceId: instance.id, chatId } });
      await this.db.message.create({ data: { tenantId: instance.tenantId, conversationId: conversation.id, direction: 'INBOUND', status: 'DELIVERED', body: text, wahaMessageId: payload?.id?._serialized ?? payload?.id, rawPayload: body } });
    }
    return { accepted: true, duplicate: stored.createdAt.getTime() < Date.now() - 1000 };
  }
}
