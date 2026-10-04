import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsString } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { MembersService } from './members.service';

class AddMemberDto { @IsEmail() email!: string; @IsString() roleId!: string; }
class StatusDto { @IsIn(['ACTIVE', 'SUSPENDED']) status!: 'ACTIVE' | 'SUSPENDED'; }

@Controller('members')
@UseGuards(AuthGuard, PermissionGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}
  @Get() @RequirePermissions('member.read') list(@Req() req: any) { return this.members.list(req.user); }
  @Post() @RequirePermissions('member.create') add(@Req() req: any, @Body() body: AddMemberDto) { return this.members.add(req.user, body.email, body.roleId); }
  @Patch(':id/status') @RequirePermissions('member.update') setStatus(@Req() req: any, @Param('id') id: string, @Body() body: StatusDto) { return this.members.setStatus(req.user, id, body.status); }
}
