import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AiAgentExecutionQuery, AiAgentExecutionsService } from './ai-agent-executions.service';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';

@Controller('ai-agent-executions')
@UseGuards(AuthGuard, PermissionGuard)
export class AiAgentExecutionsController {
  constructor(private readonly executions: AiAgentExecutionsService) {}

  @Get()
  @RequirePermissions('ai-agent-execution.read')
  list(@Req() req: any, @Query() query: AiAgentExecutionQuery) {
    return this.executions.list(req.user, query);
  }

  @Get(':id')
  @RequirePermissions('ai-agent-execution.read')
  get(@Req() req: any, @Param('id') id: string) {
    return this.executions.get(req.user, id);
  }
}
