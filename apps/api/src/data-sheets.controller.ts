import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from "class-validator";
import { AuthGuard } from "./auth.guard";
import { PermissionGuard } from "./permission.guard";
import { RequirePermissions } from "./permissions";
import { DataSheetsService } from "./data-sheets.service";

class SaveDataSheetDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() source?: string;
  @IsArray() @IsString({ each: true }) fields!: string[];
  @IsArray() rows!: Array<Record<string, unknown>>;
}

class ExternalPreviewDto {
  @IsUrl({ require_tld: false }) url!: string;
  @IsOptional() @IsIn(["GET", "POST"]) method?: string;
  @IsOptional() @IsObject() headers?: Record<string, string>;
  @IsOptional() body?: unknown;
  @IsOptional() @IsString() dataPath?: string;
}

@Controller("data-sheets")
@UseGuards(AuthGuard, PermissionGuard)
export class DataSheetsController {
  constructor(private readonly dataSheets: DataSheetsService) {}

  @Get()
  @RequirePermissions("contact.read")
  list(@Req() req: any) {
    return this.dataSheets.list(req.user);
  }

  @Post()
  @RequirePermissions("contact.manage")
  save(@Req() req: any, @Body() body: SaveDataSheetDto) {
    return this.dataSheets.save(req.user, body);
  }

  @Post("external/preview")
  @RequirePermissions("contact.manage")
  previewExternal(@Body() body: ExternalPreviewDto) {
    return this.dataSheets.previewExternal(body);
  }

  @Get(":id")
  @RequirePermissions("contact.read")
  get(@Req() req: any, @Param("id") id: string) {
    return this.dataSheets.get(req.user, id);
  }

  @Delete(":id")
  @RequirePermissions("contact.manage")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.dataSheets.remove(req.user, id);
  }
}
