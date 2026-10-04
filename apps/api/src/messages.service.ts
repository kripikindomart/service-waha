import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

@Injectable()
export class MessagesService {
  constructor(private readonly db: PrismaService, @InjectQueue('messages') private readonly queue: Queue) {}

  async sendText(user: AuthUser, instanceId: string, chatId: string, body: string) {
    const instance = await this.db.whatsappInstance.findFirst({ where: { id: instanceId, tenantId: user.tenantId } });
    if (!instance) throw new NotFoundException('instance_not_found');
    const conversation = await this.db.conversation.upsert({ where: { instanceId_chatId: { instanceId, chatId } }, update: {}, create: { tenantId: user.tenantId, instanceId, chatId } });
    const message = await this.db.message.create({ data: { tenantId: user.tenantId, conversationId: conversation.id, direction: 'OUTBOUND', body, status: 'PENDING' } });
    await this.queue.add('send-text', { messageId: message.id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 });
    return { id: message.id, status: message.status };
  }

  async retry(user: AuthUser, instanceId: string, messageId: string) {
    const message = await this.db.message.findFirst({ where: { id: messageId, tenantId: user.tenantId, direction: 'OUTBOUND', conversation: { instanceId } }, include: { conversation: true } });
    if (!message) throw new NotFoundException('message_not_found');
    if (message.status !== 'FAILED') throw new BadRequestException('message_is_not_failed');
    const retried = await this.db.message.update({ where: { id: message.id }, data: { status: 'PENDING', rawPayload: { ...(message.rawPayload && typeof message.rawPayload === 'object' && !Array.isArray(message.rawPayload) ? message.rawPayload : {}), retryRequestedAt: new Date().toISOString() } } });
    await this.queue.add('send-text', { messageId: retried.id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 });
    return { id: retried.id, status: retried.status, retried: true };
  }
}
