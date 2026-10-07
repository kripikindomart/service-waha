import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AuthUser } from "./auth.types";

type SheetInput = {
  name: string;
  source?: string;
  fields: string[];
  rows: Array<Record<string, unknown>>;
};

@Injectable()
export class DataSheetsService {
  constructor(private readonly db: PrismaService) {}

  list(user: AuthUser) {
    return this.db.dataSheet.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        source: true,
        fields: true,
        recordCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(user: AuthUser, id: string) {
    const sheet = await this.db.dataSheet.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!sheet) throw new NotFoundException("data_sheet_not_found");
    return sheet;
  }

  async save(user: AuthUser, input: SheetInput) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException("data_sheet_name_required");
    if (!Array.isArray(input.fields) || !Array.isArray(input.rows))
      throw new BadRequestException("invalid_data_sheet");
    if (input.rows.length > 10000)
      throw new BadRequestException("data_sheet_limit_exceeded");
    const fields = Array.from(
      new Set(
        input.fields.map((field) => String(field).trim()).filter(Boolean),
      ),
    );
    const rows = input.rows.map((row) =>
      Object.fromEntries(fields.map((field) => [field, row?.[field] ?? ""])),
    );
    return this.db.dataSheet.upsert({
      where: { tenantId_name: { tenantId: user.tenantId, name } },
      update: {
        source: input.source?.trim() || "manual",
        fields: fields as any,
        rows: rows as any,
        recordCount: rows.length,
      },
      create: {
        tenantId: user.tenantId,
        name,
        source: input.source?.trim() || "manual",
        fields: fields as any,
        rows: rows as any,
        recordCount: rows.length,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const result = await this.db.dataSheet.deleteMany({
      where: { id, tenantId: user.tenantId },
    });
    if (!result.count) throw new NotFoundException("data_sheet_not_found");
    return { ok: true };
  }

  async previewExternal(input: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    dataPath?: string;
  }) {
    let url: URL;
    try {
      url = new URL(input.url);
    } catch {
      throw new BadRequestException("external_api_url_invalid");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new BadRequestException("external_api_protocol_invalid");
    const method = String(input.method || "GET").toUpperCase();
    if (!["GET", "POST"].includes(method))
      throw new BadRequestException("external_api_method_invalid");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
          ...(input.headers ?? {}),
        },
        ...(method === "POST"
          ? { body: JSON.stringify(input.body ?? {}) }
          : {}),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new BadRequestException(`external_api_http_${response.status}`);
      let payload: any = await response.json();
      for (const segment of String(input.dataPath ?? "")
        .split(".")
        .map((item) => item.trim())
        .filter(Boolean)) {
        payload = payload?.[segment];
      }
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      if (!rows.length)
        throw new BadRequestException("external_api_rows_empty");
      const normalized = rows
        .slice(0, 5000)
        .map((row: any) =>
          row && typeof row === "object" && !Array.isArray(row)
            ? row
            : { value: row },
        );
      const fields = Array.from(
        new Set(normalized.flatMap((row: any) => Object.keys(row))),
      );
      return { fields, rows: normalized, total: normalized.length };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error?.name === "AbortError"
          ? "external_api_timeout"
          : error?.message || "external_api_failed",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
