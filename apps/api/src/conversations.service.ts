import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

@Injectable()
export class ConversationsService {
  constructor(private readonly db: PrismaService) {}
  async list(user: AuthUser) {
    const conversations = await this.db.conversation.findMany({
      where: { tenantId: user.tenantId },
      include: { instance: { select: { id: true, name: true, status: true, engine: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return conversations.map((conversation) => {
      const payload: any = conversation.messages[0]?.rawPayload;
      const alternate =
        payload?.payload?._data?.key?.remoteJidAlt ??
        payload?.payload?._data?.Info?.SenderAlt ??
        payload?.payload?._data?.SenderAlt ??
        payload?.payload?.remoteJidAlt;
      const chatKey = alternate
        ? String(alternate)
            .replace(/:\d+@s\.whatsapp\.net$/i, '@c.us')
            .replace('@s.whatsapp.net', '@c.us')
        : conversation.chatId;
      return { ...conversation, chatKey };
    });
  }
  async messages(user: AuthUser, id: string) {
    const conversation = await this.db.conversation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!conversation) throw new NotFoundException('conversation_not_found');
    return this.db.message.findMany({ where: { conversationId: id, tenantId: user.tenantId }, orderBy: { createdAt: 'asc' }, take: 500 });
  }
  async remove(user: AuthUser, id: string) {
    const conversation = await this.db.conversation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!conversation) throw new NotFoundException('conversation_not_found');
    await this.db.conversation.delete({ where: { id } });
    return { deleted: true, id };
  }
}
