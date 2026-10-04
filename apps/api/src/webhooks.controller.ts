import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';

@Controller('webhooks/waha')
export class WebhooksController {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  private async resolveChatId(tenantId: string, instanceId: string, rawChatId: string, alternateChatId?: string) {
    if (alternateChatId) return String(alternateChatId).replace('@s.whatsapp.net', '@c.us');
    if (!rawChatId.endsWith('@lid')) return rawChatId;
    const candidates = await this.db.conversation.findMany({ where: { tenantId, instanceId, chatId: { endsWith: '@c.us' } }, include: { messages: { select: { rawPayload: true }, take: 100 } } });
    const match = candidates.find((candidate) => candidate.messages.some((message) => {
      const payload: any = message.rawPayload;
      return payload?.payload?.from === rawChatId || payload?.payload?._data?.key?.remoteJid === rawChatId;
    }));
    return match?.chatId ?? rawChatId;
  }

  @Post()
  async receive(@Body() body: any, @Headers('x-webhook-signature') signature?: string) {
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET;
    if (webhookSecret && signature !== webhookSecret) throw new UnauthorizedException('invalid_webhook_signature');
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
    const messageId = payload?._data?.key?.id ?? payload?.id?._serialized ?? payload?.id;
    if (messageId && ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(String(ack).toUpperCase())) {
      await this.db.message.updateMany({ where: { tenantId: instance.tenantId, wahaMessageId: messageId }, data: { status: String(ack).toUpperCase() as any, rawPayload: body } });
    }
    const rawChatId = payload?.from ?? payload?.chatId ?? payload?.id?.remote;
    const alternateChatId = payload?._data?.key?.remoteJidAlt;
    const chatId = rawChatId ? await this.resolveChatId(instance.tenantId, instance.id, rawChatId, alternateChatId) : rawChatId;
    const text = payload?.body ?? payload?.text;
    if (chatId && text && event.toLowerCase().includes('message')) {
      const conversation = await this.db.conversation.upsert({ where: { instanceId_chatId: { instanceId: instance.id, chatId } }, update: {}, create: { tenantId: instance.tenantId, instanceId: instance.id, chatId } });
      const fromMe = payload?.fromMe === true || payload?._data?.key?.fromMe === true;
      const duplicate = messageId ? await this.db.message.findFirst({ where: { tenantId: instance.tenantId, wahaMessageId: messageId } }) : null;
      const recentOutbound = fromMe && !duplicate ? await this.db.message.findFirst({ where: { tenantId: instance.tenantId, conversationId: conversation.id, direction: 'OUTBOUND', body: text, createdAt: { gte: new Date(Date.now() - 60_000) } }, orderBy: { createdAt: 'desc' } }) : null;
      if (recentOutbound && messageId) await this.db.message.update({ where: { id: recentOutbound.id }, data: { wahaMessageId: messageId, rawPayload: body } });
      else if (!duplicate) {
        try { await this.db.message.create({ data: { tenantId: instance.tenantId, conversationId: conversation.id, direction: fromMe ? 'OUTBOUND' : 'INBOUND', status: fromMe ? 'SENT' : 'DELIVERED', body: text, wahaMessageId: messageId, rawPayload: body } }); }
        catch (error: any) { if (error?.code !== 'P2002') throw error; }
      }
    }
    await this.audit.logSystem(instance.tenantId, 'webhook.processed', instance.id, { event });
    return { accepted: true, duplicate: false };
  }
}
