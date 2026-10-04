import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsString, MinLength } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { RolesService } from './roles.service';

class CreateRoleDto { @IsString() @MinLength(2) name!: string; @IsArray() permissions!: string[]; }
@Controller('roles')
@UseGuards(AuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}
  @Get() @RequirePermissions('role.read') list(@Req() req: any) { return this.roles.list(req.user); }
  @Post() @RequirePermissions('role.manage') create(@Req() req: any, @Body() body: CreateRoleDto) { return this.roles.create(req.user, body.name, body.permissions); }
}
