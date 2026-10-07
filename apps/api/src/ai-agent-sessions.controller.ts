import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AiAgentSessionStatus } from '@prisma/client';
import { AiAgentSessionsService } from './ai-agent-sessions.service';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';

@Controller('ai-agent-sessions')
@UseGuards(AuthGuard, PermissionGuard)
export class AiAgentSessionsController {
  constructor(private readonly sessions: AiAgentSessionsService) {}

  @Get()
  @RequirePermissions('ai-agent-session.read')
  list(@Req() req: any, @Query('status') status?: AiAgentSessionStatus) {
    return this.sessions.list(req.user, status);
  }

  @Get(':id')
  @RequirePermissions('ai-agent-session.read')
  get(@Req() req: any, @Param('id') id: string) { return this.sessions.get(req.user, id); }

  @Post(':id/pause')
  @RequirePermissions('ai-agent-session.manage')
  pause(@Req() req: any, @Param('id') id: string) { return this.sessions.pause(req.user, id); }

  @Post(':id/resume')
  @RequirePermissions('ai-agent-session.manage')
  resume(@Req() req: any, @Param('id') id: string) { return this.sessions.resume(req.user, id); }

  @Post(':id/handoff')
  @RequirePermissions('ai-agent-session.manage')
  handoff(@Req() req: any, @Param('id') id: string) { return this.sessions.handoff(req.user, id); }

  @Post(':id/close')
  @RequirePermissions('ai-agent-session.manage')
  close(@Req() req: any, @Param('id') id: string) { return this.sessions.closeOwned(req.user, id); }

  @Post(':id/reset-memory')
  @RequirePermissions('ai-agent-session.manage')
  resetMemory(@Req() req: any, @Param('id') id: string) { return this.sessions.resetMemory(req.user, id); }
}
