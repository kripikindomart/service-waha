import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiKeysService } from './api-keys.service';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';

class CreateApiKeyDto {
  @IsString() @MinLength(2) name!: string;
  @IsArray() @IsString({ each: true }) permissions!: string[];
  @IsOptional() @IsISO8601() expiresAt?: string;
}

@Controller('api-keys')
@UseGuards(AuthGuard, PermissionGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @RequirePermissions('api-key.read')
  list(@Req() req: any) { return this.apiKeys.list(req.user); }

  @Post()
  @RequirePermissions('api-key.manage')
  create(@Req() req: any, @Body() body: CreateApiKeyDto) { return this.apiKeys.create(req.user, body); }

  @Delete(':id')
  @RequirePermissions('api-key.manage')
  revoke(@Req() req: any, @Param('id') id: string) { return this.apiKeys.revoke(req.user, id); }
}
