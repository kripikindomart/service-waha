import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from './prisma.service';
import { normalizeChatId } from './messages.service';

@Processor('messages')
export class MessagesProcessor extends WorkerHost {
  private readonly waha = axios.create({ baseURL: process.env.WAHA_BASE_URL ?? 'http://127.0.0.1:3000', headers: { 'X-Api-Key': process.env.WAHA_API_KEY ?? '' }, timeout: 15000 });
  constructor(private readonly db: PrismaService) { super(); }

  async process(job: Job<{ messageId: string }>) {
    const message = await this.db.message.findUnique({ where: { id: job.data.messageId }, include: { conversation: { include: { instance: true } } } });
    if (!message || !message.body) return;
    try {
      const result = await this.waha.post('/api/sendText', { session: message.conversation.instance.wahaSession, chatId: normalizeChatId(message.conversation.chatId), text: message.body });
      await this.db.message.update({ where: { id: message.id }, data: { status: 'SENT', wahaMessageId: result.data?.key?.id ?? result.data?.id ?? result.data?.message?.id, rawPayload: result.data } });
    } catch (error: any) {
      await this.db.message.update({ where: { id: message.id }, data: { status: 'FAILED', rawPayload: { error: error?.message ?? 'send_failed' } } });
      throw error;
    }
  }
}
