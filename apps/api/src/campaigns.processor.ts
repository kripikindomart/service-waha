import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "./prisma.service";
import { normalizeChatId } from "./messages.service";
import { wahaClient } from "./waha.client";
import { htmlToWhatsApp } from "./message-format";

function providerFailureMessage(error: any) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const detail =
    data?.message ??
    data?.error ??
    (typeof data === "string" ? data : undefined) ??
    error?.message;
  const prefix = status
    ? `Provider menolak pengiriman (HTTP ${status})`
    : "Pengiriman gagal";
  return detail && !/^Request failed with status code/i.test(String(detail))
    ? `${prefix}: ${String(detail)}`
    : prefix;
}

function render(
  body: string,
  recipient: {
    name: string;
    phone: string;
    contact?: { customFields: unknown } | null;
  },
) {
  const fields =
    recipient.contact?.customFields &&
    typeof recipient.contact.customFields === "object"
      ? (recipient.contact.customFields as Record<string, unknown>)
      : {};
  let rendered = htmlToWhatsApp(body)
    .replace(/\{\{\s*name\s*\}\}|\[NAMA\]/gi, recipient.name)
    .replace(/\{\{\s*phone\s*\}\}|\[NOMOR_HP\]/gi, recipient.phone);
  for (const [key, value] of Object.entries(fields)) {
    const text = String(value ?? "");
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rendered = rendered
      .replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "gi"), text)
      .replace(new RegExp(`\\[${escaped}\\]`, "gi"), text);
  }
  return rendered;
}

@Processor("broadcasts")
export class CampaignsProcessor extends WorkerHost {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async process(job: Job<{ campaignId: string }>) {
    const campaign = await this.db.blastCampaign.findUnique({
      where: { id: job.data.campaignId },
      include: { instance: true },
    });
    if (!campaign || campaign.status === "CANCELLED") return;
    await this.db.blastCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "RUNNING",
        startedAt: campaign.startedAt ?? new Date(),
        error: null,
      },
    });
    const recipients = await this.db.blastRecipient.findMany({
      where: { campaignId: campaign.id, status: { in: ["PENDING", "QUEUED"] } },
      include: { contact: { select: { customFields: true } } },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    let processed = 0;
    for (const recipient of recipients) {
      const current = await this.db.blastCampaign.findUnique({
        where: { id: campaign.id },
        select: { status: true },
      });
      if (!current || current.status === "CANCELLED") return;
      if (processed && processed % campaign.batchSize === 0)
        await new Promise((resolve) => setTimeout(resolve, campaign.delayMs));
      await this.db.blastRecipient.update({
        where: { id: recipient.id },
        data: { status: "QUEUED", queuedAt: new Date() },
      });
      try {
        const waha = wahaClient(campaign.instance.engine);
        const existence = await waha.get("/api/contacts/check-exists", {
          params: {
            session: campaign.instance.wahaSession,
            phone: recipient.phone,
          },
        });
        if (existence.data?.numberExists === false) {
          throw new Error(
            "Nomor tidak terdaftar di WhatsApp atau sudah tidak aktif",
          );
        }
        const conversation = await this.db.conversation.upsert({
          where: {
            instanceId_chatId: {
              instanceId: campaign.instanceId,
              chatId: normalizeChatId(recipient.phone),
            },
          },
          update: {},
          create: {
            tenantId: campaign.tenantId,
            instanceId: campaign.instanceId,
            chatId: normalizeChatId(recipient.phone),
          },
        });
        const message = await this.db.message.create({
          data: {
            tenantId: campaign.tenantId,
            conversationId: conversation.id,
            direction: "OUTBOUND",
            body: render(campaign.body, recipient),
            status: "PENDING",
          },
        });
        const result = await waha.post("/api/sendText", {
          session: campaign.instance.wahaSession,
          chatId: normalizeChatId(recipient.phone),
          text: message.body,
        });
        await this.db.message.update({
          where: { id: message.id },
          data: {
            status: "SENT",
            wahaMessageId:
              result.data?.key?.id ??
              result.data?.id ??
              result.data?.message?.id,
            rawPayload: result.data,
          },
        });
        await this.db.blastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "SENT",
            messageId: message.id,
            sentAt: new Date(),
            error: null,
          },
        });
      } catch (error: any) {
        await this.db.blastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            error: providerFailureMessage(error),
          },
        });
      }
      processed += 1;
      if (processed < recipients.length)
        await new Promise((resolve) => setTimeout(resolve, campaign.delayMs));
    }
    const current = await this.db.blastCampaign.findUnique({
      where: { id: campaign.id },
      select: { status: true },
    });
    if (!current || current.status === "CANCELLED") return;
    const failed = await this.db.blastRecipient.count({
      where: { campaignId: campaign.id, status: "FAILED" },
    });
    await this.db.blastCampaign.update({
      where: { id: campaign.id },
      data: {
        status: failed ? "FAILED" : "COMPLETED",
        completedAt: new Date(),
        error: failed ? `${failed} recipient gagal dikirim` : null,
      },
    });
  }
}
