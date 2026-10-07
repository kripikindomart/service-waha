import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { AuthGuard } from "./auth.guard";
import { PermissionGuard } from "./permission.guard";
import { RequirePermissions } from "./permissions";
import { CampaignsService } from "./campaigns.service";

class CampaignPreviewDto {
  @IsOptional() @IsArray() @IsString({ each: true }) groupIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) contactIds?: string[];
}
class CreateCampaignDto extends CampaignPreviewDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(1) body!: string;
  @IsString() instanceId!: string;
  @IsOptional() @IsInt() @Min(0) delayMs?: number;
  @IsOptional() @IsInt() @Min(1) batchSize?: number;
  @IsOptional() @IsISO8601() scheduledAt?: string;
}

@Controller("campaigns")
@UseGuards(AuthGuard, PermissionGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}
  @Get() @RequirePermissions("message.read") list(@Req() req: any) {
    return this.campaigns.list(req.user);
  }
  @Get(":id") @RequirePermissions("message.read") get(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.campaigns.get(req.user, id);
  }
  @Post("preview") @RequirePermissions("message.read") preview(
    @Req() req: any,
    @Body() body: CampaignPreviewDto,
  ) {
    return this.campaigns.preview(req.user, body);
  }
  @Post() @RequirePermissions("message.send") create(
    @Req() req: any,
    @Body() body: CreateCampaignDto,
  ) {
    return this.campaigns.create(req.user, body);
  }
  @Post(":id/queue") @RequirePermissions("message.send") queue(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.campaigns.queueCampaign(req.user, id);
  }
  @Post(":id/retry") @RequirePermissions("message.send") retry(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.campaigns.retryFailed(req.user, id);
  }
  @Post(":id/cancel") @RequirePermissions("message.send") cancel(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.campaigns.cancel(req.user, id);
  }
}
