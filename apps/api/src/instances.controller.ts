import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { InstancesService } from './instances.service';

class CreateInstanceDto { @IsString() @MinLength(2) name!: string; }
@Controller('instances')
@UseGuards(AuthGuard)
export class InstancesController {
  constructor(private readonly instances: InstancesService) {}
  @Get() list(@Req() req: any) { return this.instances.list(req.user); }
  @Post() create(@Req() req: any, @Body() body: CreateInstanceDto) { return this.instances.create(req.user, body.name); }
  @Post(':id/start') start(@Req() req: any, @Param('id') id: string) { return this.instances.start(req.user, id); }
  @Post(':id/stop') stop(@Req() req: any, @Param('id') id: string) { return this.instances.stop(req.user, id); }
}
