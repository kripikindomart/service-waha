import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { AutomationsService } from './automations.service';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';

class AutomationDto {
  @IsString() @MinLength(2) name!: string;
  @IsIn(['contains', 'exact', 'any']) trigger!: 'contains' | 'exact' | 'any';
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsString() response?: string;
  @IsOptional() @IsString() instanceId?: string | null;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(3600) cooldownSeconds?: number;
  @IsOptional() @IsIn(['STATIC', 'AI']) responseMode?: 'STATIC' | 'AI';
  @IsOptional() @IsString() aiProviderId?: string | null;
  @IsOptional() @IsString() aiModel?: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(2) temperature?: number;
  @IsOptional() @IsInt() @Min(1) @Max(8192) maxTokens?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50) historyLimit?: number;
}

class UpdateAutomationDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsIn(['contains', 'exact', 'any']) trigger?: 'contains' | 'exact' | 'any';
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsString() response?: string;
  @IsOptional() @IsString() instanceId?: string | null;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(3600) cooldownSeconds?: number;
  @IsOptional() @IsIn(['STATIC', 'AI']) responseMode?: 'STATIC' | 'AI';
  @IsOptional() @IsString() aiProviderId?: string | null;
  @IsOptional() @IsString() aiModel?: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(2) temperature?: number;
  @IsOptional() @IsInt() @Min(1) @Max(8192) maxTokens?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50) historyLimit?: number;
}

@Controller('automations')
@UseGuards(AuthGuard, PermissionGuard)
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}
  @Get() @RequirePermissions('message.read') list(@Req() req: any) { return this.automations.list(req.user); }
  @Post() @RequirePermissions('message.send') create(@Req() req: any, @Body() body: AutomationDto) { return this.automations.create(req.user, body); }
  @Patch(':id') @RequirePermissions('message.send') update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateAutomationDto) { return this.automations.update(req.user, id, body); }
  @Delete(':id') @RequirePermissions('message.send') remove(@Req() req: any, @Param('id') id: string) { return this.automations.remove(req.user, id); }
}
