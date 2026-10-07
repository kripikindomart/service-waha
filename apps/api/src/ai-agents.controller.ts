import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AiAgentsService, AiAgentInput, AiAgentTargetInput } from './ai-agents.service';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';

@Controller('ai-agents')
@UseGuards(AuthGuard, PermissionGuard)
export class AiAgentsController {
  constructor(private readonly agents: AiAgentsService) {}

  @Get()
  @RequirePermissions('ai-agent.read')
  list(@Req() req: any) { return this.agents.list(req.user); }

  @Post()
  @RequirePermissions('ai-agent.manage')
  create(@Req() req: any, @Body() body: AiAgentInput) { return this.agents.create(req.user, body); }

  @Get(':id')
  @RequirePermissions('ai-agent.read')
  get(@Req() req: any, @Param('id') id: string) { return this.agents.get(req.user, id); }

  @Patch(':id')
  @RequirePermissions('ai-agent.manage')
  update(@Req() req: any, @Param('id') id: string, @Body() body: Partial<AiAgentInput>) {
    return this.agents.update(req.user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('ai-agent.manage')
  remove(@Req() req: any, @Param('id') id: string) { return this.agents.remove(req.user, id); }

  @Post(':id/duplicate')
  @RequirePermissions('ai-agent.manage')
  duplicate(@Req() req: any, @Param('id') id: string) { return this.agents.duplicate(req.user, id); }

  @Post(':id/enable')
  @RequirePermissions('ai-agent.manage')
  enable(@Req() req: any, @Param('id') id: string) { return this.agents.setEnabled(req.user, id, true); }

  @Post(':id/disable')
  @RequirePermissions('ai-agent.manage')
  disable(@Req() req: any, @Param('id') id: string) { return this.agents.setEnabled(req.user, id, false); }

  @Post(':id/test')
  @RequirePermissions('ai-agent.execute')
  test(@Req() req: any, @Param('id') id: string, @Body() body: { message?: string }) {
    return this.agents.test(req.user, id, body.message ?? 'Halo');
  }

  @Get(':id/targets')
  @RequirePermissions('ai-agent.read')
  targets(@Req() req: any, @Param('id') id: string) { return this.agents.listTargets(req.user, id); }

  @Put(':id/targets')
  @RequirePermissions('ai-agent.manage')
  replaceTargets(@Req() req: any, @Param('id') id: string, @Body() body: { targets?: AiAgentTargetInput[] }) {
    return this.agents.replaceTargets(req.user, id, body.targets ?? []);
  }
}
