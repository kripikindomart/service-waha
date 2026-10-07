import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(AuthGuard, PermissionGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}
  @Get() @RequirePermissions('message.read') list(@Req() req: any) { return this.conversations.list(req.user); }
  @Get(':id/messages') @RequirePermissions('message.read') messages(@Req() req: any, @Param('id') id: string) { return this.conversations.messages(req.user, id); }
  @Delete(':id') @RequirePermissions('message.read') remove(@Req() req: any, @Param('id') id: string) { return this.conversations.remove(req.user, id); }
}
