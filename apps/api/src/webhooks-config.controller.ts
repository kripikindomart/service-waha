import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { WebhooksService } from './webhooks.service';

class CreateWebhookDto { @IsString() @MinLength(2) name!: string; @IsUrl({ require_tld: false }) url!: string; @IsOptional() @IsString() secret?: string; @IsOptional() @IsArray() @IsString({ each: true }) events?: string[]; @IsOptional() @IsBoolean() isDefault?: boolean; }
class AssignWebhookDto { @IsOptional() @IsString() webhookEndpointId!: string | null; }
@Controller('webhooks')
@UseGuards(AuthGuard, PermissionGuard)
export class WebhooksConfigController {
  constructor(private readonly webhooks: WebhooksService) {}
  @Get() @RequirePermissions('instance.read') list(@Req() req: any) { return this.webhooks.list(req.user); }
  @Post() @RequirePermissions('instance.control') create(@Req() req: any, @Body() body: CreateWebhookDto) { return this.webhooks.create(req.user, body); }
  @Delete(':id') @RequirePermissions('instance.control') remove(@Req() req: any, @Param('id') id: string) { return this.webhooks.remove(req.user, id); }
  @Post('/instances/:instanceId/assign') @RequirePermissions('instance.control') assign(@Req() req: any, @Param('instanceId') instanceId: string, @Body() body: AssignWebhookDto) { return this.webhooks.assign(req.user, instanceId, body.webhookEndpointId ?? null); }
}
