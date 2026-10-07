import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiProvidersService } from './ai-providers.service';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';

class ProviderDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(1) prefix!: string;
  @IsIn(['OPENAI', 'ANTHROPIC']) protocol!: 'OPENAI' | 'ANTHROPIC';
  @IsString() baseUrl!: string;
  @IsOptional() @IsString() defaultModel?: string;
  @IsOptional() @IsString() modelId?: string;
  @IsOptional() @IsString() apiKey?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() roundRobin?: boolean;
}

class UpdateProviderDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() @MinLength(1) prefix?: string;
  @IsOptional() @IsIn(['OPENAI', 'ANTHROPIC']) protocol?: 'OPENAI' | 'ANTHROPIC';
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsString() defaultModel?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() roundRobin?: boolean;
}

class CredentialDto {
  @IsOptional() @IsString() label?: string;
  @IsString() @MinLength(1) apiKey!: string;
}

class UpdateCredentialDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() apiKey?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

class CheckDto {
  @IsIn(['OPENAI', 'ANTHROPIC']) protocol!: 'OPENAI' | 'ANTHROPIC';
  @IsString() baseUrl!: string;
  @IsString() apiKey!: string;
  @IsOptional() @IsString() modelId?: string;
}

class ModelDto { @IsString() @MinLength(1) modelId!: string; }
class TestCredentialDto { @IsOptional() @IsString() modelId?: string; }
class ChatMessageDto {
  @IsIn(['user', 'assistant']) role!: 'user' | 'assistant';
  @IsString() content!: string;
}
class ChatDto {
  @IsString() providerId!: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() systemPrompt?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChatMessageDto) messages!: ChatMessageDto[];
  @IsOptional() @IsNumber() @Min(0) @Max(2) temperature?: number;
  @IsOptional() @IsInt() @Min(1) @Max(8192) maxTokens?: number;
}

@Controller('ai-providers')
@UseGuards(AuthGuard, PermissionGuard)
export class AiProvidersController {
  constructor(private readonly providers: AiProvidersService) {}

  @Get() @RequirePermissions('message.read') list(@Req() req: any) { return this.providers.list(req.user); }
  @Get(':id') @RequirePermissions('message.read') get(@Req() req: any, @Param('id') id: string) { return this.providers.get(req.user, id); }
  @Post() @RequirePermissions('message.send') create(@Req() req: any, @Body() body: ProviderDto) { return this.providers.create(req.user, body); }
  @Patch(':id') @RequirePermissions('message.send') update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateProviderDto) { return this.providers.update(req.user, id, body); }
  @Delete(':id') @RequirePermissions('message.send') remove(@Req() req: any, @Param('id') id: string) { return this.providers.remove(req.user, id); }

  @Post('check/draft') @RequirePermissions('message.send') checkDraft(@Body() body: CheckDto) { return this.providers.checkDraft(body); }
  @Post(':id/credentials') @RequirePermissions('message.send') addCredential(@Req() req: any, @Param('id') id: string, @Body() body: CredentialDto) { return this.providers.addCredential(req.user, id, body); }
  @Patch(':id/credentials/:credentialId') @RequirePermissions('message.send') updateCredential(@Req() req: any, @Param('id') id: string, @Param('credentialId') credentialId: string, @Body() body: UpdateCredentialDto) { return this.providers.updateCredential(req.user, id, credentialId, body); }
  @Delete(':id/credentials/:credentialId') @RequirePermissions('message.send') removeCredential(@Req() req: any, @Param('id') id: string, @Param('credentialId') credentialId: string) { return this.providers.removeCredential(req.user, id, credentialId); }
  @Post(':id/credentials/:credentialId/test') @RequirePermissions('message.send') testCredential(@Req() req: any, @Param('id') id: string, @Param('credentialId') credentialId: string, @Body() body: TestCredentialDto) { return this.providers.testCredential(req.user, id, credentialId, body.modelId); }

  @Post(':id/models/import') @RequirePermissions('message.send') importModels(@Req() req: any, @Param('id') id: string, @Body() body: { credentialId?: string }) { return this.providers.importModels(req.user, id, body.credentialId); }
  @Post(':id/models') @RequirePermissions('message.send') addModel(@Req() req: any, @Param('id') id: string, @Body() body: ModelDto) { return this.providers.addModel(req.user, id, body.modelId); }
  @Delete(':id/models/:modelId') @RequirePermissions('message.send') removeModel(@Req() req: any, @Param('id') id: string, @Param('modelId') modelId: string) { return this.providers.removeModel(req.user, id, modelId); }

  @Post('chat/completions') @RequirePermissions('message.send') complete(@Req() req: any, @Body() body: ChatDto) { return this.providers.complete(req.user, body); }
}
