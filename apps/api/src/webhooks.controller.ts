import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "./prisma.service";
import { AuditService } from "./audit.service";
import { AutomationsService } from "./automations.service";
import { htmlToWhatsApp } from "./message-format";
import { AiAgentRouterService } from "./ai-agent-router.service";

@Controller("webhooks/waha")
export class WebhooksController {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly automations: AutomationsService,
    private readonly aiAgents: AiAgentRouterService,
  ) {}

  private async resolveChatId(
    tenantId: string,
    instanceId: string,
    rawChatId: string,
    alternateChatId?: string,
  ) {
    if (alternateChatId) {
      const alternate = String(alternateChatId)
        .replace(/:\d+@s\.whatsapp\.net$/i, "@c.us")
        .replace("@s.whatsapp.net", "@c.us");
      return alternate;
    }
    if (!rawChatId.endsWith("@lid")) return rawChatId;
    const candidates = await this.db.conversation.findMany({
      where: { tenantId, chatId: { endsWith: "@c.us" } },
      include: { messages: { select: { rawPayload: true }, take: 100 } },
    });
    const match = candidates.find((candidate) =>
      candidate.messages.some((message) => {
        const payload: any = message.rawPayload;
        return (
          payload?.payload?.from === rawChatId ||
          payload?.payload?._data?.key?.remoteJid === rawChatId ||
          payload?.payload?._data?.key?.remoteJidAlt === rawChatId
        );
      }),
    );
    return match?.chatId ?? rawChatId;
  }

  @Post()
  async receive(
    @Body() body: any,
    @Headers("x-webhook-signature") signature?: string,
  ) {
    const webhookSecret = process.env.WAHA_WEBHOOK_SECRET;
    if (webhookSecret && signature !== webhookSecret)
      throw new UnauthorizedException("invalid_webhook_signature");
    const session = body?.session ?? body?.payload?.session;
    const event = body?.event ?? body?.eventName ?? "unknown";
    if (!session) return { accepted: false, reason: "missing_session" };
    const instance = await this.db.whatsappInstance.findUnique({
      where: { wahaSession: session },
    });
    if (!instance) return { accepted: false, reason: "unknown_session" };
    const eventKey = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    const existing = await this.db.webhookEvent.findUnique({
      where: { eventKey },
    });
    if (existing) return { accepted: true, duplicate: true };
    await this.db.webhookEvent.create({
      data: {
        eventKey,
        tenantId: instance.tenantId,
        instanceId: instance.id,
        event,
        payload: body,
        processedAt: new Date(),
      },
    });
    const payload = body?.payload ?? body?.data ?? body;
    const ack = payload?.ackName ?? payload?.ack ?? payload?.status;
    const ackNames: Record<
      string,
      "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"
    > = {
      "-1": "FAILED",
      "0": "PENDING",
      "1": "SENT",
      "2": "DELIVERED",
      "3": "READ",
      "4": "READ",
      ERROR: "FAILED",
      PENDING: "PENDING",
      SERVER: "SENT",
      SENT: "SENT",
      DEVICE: "DELIVERED",
      DELIVERED: "DELIVERED",
      READ: "READ",
      PLAYED: "READ",
      FAILED: "FAILED",
    };
    const messageStatus = ackNames[String(ack).toUpperCase()];
    const rawMessageId =
      payload?._data?.key?.id ?? payload?.id?._serialized ?? payload?.id;
    const messageIds = Array.from(
      new Set(
        [
          rawMessageId,
          ...(Array.isArray(payload?._data?.MessageIDs)
            ? payload._data.MessageIDs
            : []),
          typeof rawMessageId === "string"
            ? rawMessageId.split("_").at(-1)
            : null,
        ].filter((value): value is string => Boolean(value)),
      ),
    );
    if (messageIds.length && messageStatus) {
      await this.db.message.updateMany({
        where: {
          tenantId: instance.tenantId,
          wahaMessageId: { in: messageIds },
        },
        data: { status: messageStatus, rawPayload: body },
      });
    }
    const messageId = rawMessageId;
    const rawChatId = payload?.from ?? payload?.chatId ?? payload?.id?.remote;
    const alternateChatId =
      payload?._data?.key?.remoteJidAlt ??
      payload?._data?.Info?.SenderAlt ??
      payload?._data?.SenderAlt;
    const chatId = rawChatId
      ? await this.resolveChatId(
          instance.tenantId,
          instance.id,
          rawChatId,
          alternateChatId,
        )
      : rawChatId;
    const text = htmlToWhatsApp(payload?.body ?? payload?.text ?? "");
    if (chatId && text && event.toLowerCase().includes("message")) {
      let conversation;
      try {
        conversation = await this.db.conversation.upsert({
          where: { instanceId_chatId: { instanceId: instance.id, chatId } },
          update: {},
          create: {
            tenantId: instance.tenantId,
            instanceId: instance.id,
            chatId,
          },
        });
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
        conversation = await this.db.conversation.findUniqueOrThrow({
          where: { instanceId_chatId: { instanceId: instance.id, chatId } },
        });
      }
      const fromMe =
        payload?.fromMe === true || payload?._data?.key?.fromMe === true;
      const duplicate = messageId
        ? await this.db.message.findFirst({
            where: { tenantId: instance.tenantId, wahaMessageId: messageId },
          })
        : null;
      const recentOutbound =
        fromMe && !duplicate
          ? await this.db.message.findFirst({
              where: {
                tenantId: instance.tenantId,
                conversationId: conversation.id,
                direction: "OUTBOUND",
                body: text,
                createdAt: { gte: new Date(Date.now() - 60_000) },
              },
              orderBy: { createdAt: "desc" },
            })
          : null;
      if (recentOutbound && messageId)
        await this.db.message.update({
          where: { id: recentOutbound.id },
          data: { wahaMessageId: messageId, rawPayload: body },
        });
      else if (!duplicate) {
        try {
          await this.db.message.create({
            data: {
              tenantId: instance.tenantId,
              conversationId: conversation.id,
              direction: fromMe ? "OUTBOUND" : "INBOUND",
              status: fromMe ? "SENT" : "DELIVERED",
              body: text,
              wahaMessageId: messageId,
              rawPayload: body,
            },
          });
        } catch (error: any) {
          if (error?.code !== "P2002") throw error;
        }
      }
      if (!fromMe) {
        try {
          const participantId = payload?.participant
            ?? payload?._data?.key?.participant
            ?? payload?._data?.Info?.Sender
            ?? null;
          const quoted = payload?._data?.quotedMsg ?? payload?.quotedMsg ?? payload?.replyTo;
          const aiResult = await this.aiAgents.handleInbound({
            tenantId: instance.tenantId,
            instanceId: instance.id,
            chatId,
            participantId,
            text,
            inboundMessageId: String(messageId ?? eventKey),
            mentioned: Array.isArray(payload?.mentionedIds) && payload.mentionedIds.length > 0,
            repliedToAgent: Boolean(quoted?.fromMe ?? quoted?._data?.key?.fromMe),
          });
          if (aiResult?.handled) {
            await this.audit.logSystem(instance.tenantId, "ai_agent.routed", ('agentId' in aiResult ? aiResult.agentId : null) ?? instance.id, {
              inboundMessageId: messageId,
              executionId: aiResult.executionId,
              action: aiResult.action,
            });
          } else {
            const automation = await this.automations.handleInbound(
              instance.tenantId,
              instance.id,
              chatId,
              text,
              String(messageId ?? eventKey),
            );
            if (automation)
            await this.audit.logSystem(
              instance.tenantId,
              "automation.triggered",
              automation.ruleId,
              { inboundMessageId: messageId, outboundMessageId: automation.messageId },
            );
          }
        } catch (error: any) {
          await this.audit.logSystem(
            instance.tenantId,
            "inbound_automation.failed",
            instance.id,
            { message: error?.message ?? "automation_failed", inboundMessageId: messageId },
          );
        }
      }
    }
    await this.audit.logSystem(
      instance.tenantId,
      "webhook.processed",
      instance.id,
      { event },
    );
    return { accepted: true, duplicate: false };
  }
}
