import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { ContactGroupsService } from './contact-groups.service';

class CreateGroupDto { @IsString() @MinLength(2) name!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() color?: string; @IsOptional() @IsArray() @IsString({ each: true }) contactIds?: string[]; }
class MembersDto { @IsArray() @IsString({ each: true }) contactIds!: string[]; }

@Controller('contact-groups')
@UseGuards(AuthGuard, PermissionGuard)
export class ContactGroupsController {
  constructor(private readonly groups: ContactGroupsService) {}
  @Get() @RequirePermissions('contact.read') list(@Req() req: any) { return this.groups.list(req.user); }
  @Post() @RequirePermissions('contact.manage') create(@Req() req: any, @Body() body: CreateGroupDto) { return this.groups.create(req.user, body); }
  @Put(':id/members') @RequirePermissions('contact.manage') updateMembers(@Req() req: any, @Param('id') id: string, @Body() body: MembersDto) { return this.groups.updateMembers(req.user, id, body.contactIds); }
  @Delete(':id') @RequirePermissions('contact.manage') remove(@Req() req: any, @Param('id') id: string) { return this.groups.remove(req.user, id); }
}
