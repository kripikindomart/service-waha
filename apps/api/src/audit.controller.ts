import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions } from './permissions';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(AuthGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get() @RequirePermissions('audit.read') list(@Req() req: any) { return this.audit.list(req.user); }
}
