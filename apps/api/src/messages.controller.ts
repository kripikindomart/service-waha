import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { MessagesService } from './messages.service';

class SendTextDto { @IsString() @MinLength(3) chatId!: string; @IsString() @MinLength(1) body!: string; }
@Controller('instances/:instanceId/messages')
@UseGuards(AuthGuard, PermissionGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}
  @Post('text') @RequirePermissions('message.send') sendText(@Req() req: any, @Param('instanceId') instanceId: string, @Body() body: SendTextDto) { return this.messages.sendText(req.user, instanceId, body.chatId, body.body); }
  @Post(':messageId/retry') @RequirePermissions('message.send') retry(@Req() req: any, @Param('instanceId') instanceId: string, @Param('messageId') messageId: string) { return this.messages.retry(req.user, instanceId, messageId); }
}
