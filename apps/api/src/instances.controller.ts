import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { IsIn, IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { InstancesService } from './instances.service';

class CreateInstanceDto { @IsString() @MinLength(2) name!: string; @IsIn(['NOWEB', 'GOWS']) engine: 'NOWEB' | 'GOWS' = 'NOWEB'; }
@Controller('instances')
@UseGuards(AuthGuard, PermissionGuard)
export class InstancesController {
  constructor(private readonly instances: InstancesService) {}
  @Get() @RequirePermissions('instance.read') list(@Req() req: any) { return this.instances.list(req.user); }
  @Post() @RequirePermissions('instance.create') create(@Req() req: any, @Body() body: CreateInstanceDto) { return this.instances.create(req.user, body.name, body.engine); }
  @Post(':id/start') @RequirePermissions('instance.control') start(@Req() req: any, @Param('id') id: string) { return this.instances.start(req.user, id); }
  @Post(':id/stop') @RequirePermissions('instance.control') stop(@Req() req: any, @Param('id') id: string) { return this.instances.stop(req.user, id); }
  @Delete(':id') @RequirePermissions('instance.control') remove(@Req() req: any, @Param('id') id: string) { return this.instances.remove(req.user, id); }
  @Get(':id/status') @RequirePermissions('instance.read') status(@Req() req: any, @Param('id') id: string) { return this.instances.status(req.user, id); }
  @Get(':id/qr') @RequirePermissions('instance.read') async qr(@Req() req: any, @Param('id') id: string, @Res() reply: FastifyReply) { const qr = await this.instances.qr(req.user, id); return reply.header('Content-Type', qr.contentType).send(qr.data); }
}
