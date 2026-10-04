import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

@Injectable()
export class ConversationsService {
  constructor(private readonly db: PrismaService) {}
  list(user: AuthUser) {
    return this.db.conversation.findMany({
      where: { tenantId: user.tenantId },
      include: { instance: { select: { id: true, name: true, status: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }
  async messages(user: AuthUser, id: string) {
    const conversation = await this.db.conversation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!conversation) throw new NotFoundException('conversation_not_found');
    return this.db.message.findMany({ where: { conversationId: id, tenantId: user.tenantId }, orderBy: { createdAt: 'asc' }, take: 500 });
  }
}
