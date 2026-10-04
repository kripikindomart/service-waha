import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { InstancesService } from './instances.service';

class CreateInstanceDto { @IsString() @MinLength(2) name!: string; }
@Controller('instances')
@UseGuards(AuthGuard, PermissionGuard)
export class InstancesController {
  constructor(private readonly instances: InstancesService) {}
  @Get() @RequirePermissions('instance.read') list(@Req() req: any) { return this.instances.list(req.user); }
  @Post() @RequirePermissions('instance.create') create(@Req() req: any, @Body() body: CreateInstanceDto) { return this.instances.create(req.user, body.name); }
  @Post(':id/start') @RequirePermissions('instance.control') start(@Req() req: any, @Param('id') id: string) { return this.instances.start(req.user, id); }
  @Post(':id/stop') @RequirePermissions('instance.control') stop(@Req() req: any, @Param('id') id: string) { return this.instances.stop(req.user, id); }
}
