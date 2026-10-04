import { Body, Controller, Delete, Get, Patch, Post, Query, Param, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { ContactsService } from './contacts.service';

class ContactDto { @IsString() @MinLength(2) name!: string; @IsString() @MinLength(5) phone!: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsString() company?: string; @IsOptional() @IsString() notes?: string; @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]; }
class UpdateContactDto { @IsOptional() @IsString() name?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsEmail() email?: string; @IsOptional() @IsString() company?: string; @IsOptional() @IsString() notes?: string; @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]; }
class ImportContactsDto { @IsString() source!: 'contacts' | 'groups'; }
class ImportPreviewDto { @IsString() source!: 'contacts' | 'groups'; }
class ImportCommitDto { @IsString() source!: 'contacts' | 'groups'; @IsArray() contacts!: Array<{ phone: string; wahaId?: string; name?: string; groupId?: string; groupName?: string }>; }

@Controller('contacts')
@UseGuards(AuthGuard, PermissionGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}
  @Get() @RequirePermissions('contact.read') list(@Req() req: any, @Query('q') q?: string) { return this.contacts.list(req.user, q); }
  @Post() @RequirePermissions('contact.manage') create(@Req() req: any, @Body() body: ContactDto) { return this.contacts.create(req.user, body); }
  @Post('import/:instanceId') @RequirePermissions('contact.manage') import(@Req() req: any, @Param('instanceId') instanceId: string, @Body() body: ImportContactsDto) { return this.contacts.importFromWaha(req.user, instanceId, body.source); }
  @Post('import/:instanceId/preview') @RequirePermissions('contact.manage') preview(@Req() req: any, @Param('instanceId') instanceId: string, @Body() body: ImportPreviewDto) { return this.contacts.previewFromWaha(req.user, instanceId, body.source); }
  @Post('import/:instanceId/commit') @RequirePermissions('contact.manage') commit(@Req() req: any, @Param('instanceId') instanceId: string, @Body() body: ImportCommitDto) { return this.contacts.commitPreview(req.user, instanceId, body.source, body.contacts); }
  @Patch(':id') @RequirePermissions('contact.manage') update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateContactDto) { return this.contacts.update(req.user, id, body); }
  @Delete(':id') @RequirePermissions('contact.manage') remove(@Req() req: any, @Param('id') id: string) { return this.contacts.remove(req.user, id); }
}
