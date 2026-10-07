import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "./prisma.service";
import { AuthUser } from "./auth.types";
import { htmlToWhatsApp } from "./message-format";

@Injectable()
export class CampaignsService {
  constructor(
    private readonly db: PrismaService,
    @InjectQueue("broadcasts") private readonly queue: Queue,
  ) {}

  async list(user: AuthUser) {
    const campaigns = await this.db.blastCampaign.findMany({
      where: { tenantId: user.tenantId },
      include: {
        instance: { select: { name: true, engine: true } },
        recipients: {
          select: { status: true, messageId: true },
        },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const messageIds = campaigns.flatMap((campaign) =>
      campaign.recipients
        .map((recipient) => recipient.messageId)
        .filter((messageId): messageId is string => Boolean(messageId)),
    );
    const messages = messageIds.length
      ? await this.db.message.findMany({
          where: { tenantId: user.tenantId, id: { in: messageIds } },
          select: { id: true, status: true },
        })
      : [];
    const messageStatuses = new Map(
      messages.map((message) => [message.id, message.status]),
    );
    return campaigns.map(({ recipients, ...campaign }) => ({
      ...campaign,
      stats: {
        total: recipients.length,
        sent: recipients.filter((recipient) => recipient.status === "SENT")
          .length,
        read: recipients.filter(
          (recipient) =>
            recipient.messageId &&
            messageStatuses.get(recipient.messageId) === "READ",
        ).length,
        delivered: recipients.filter(
          (recipient) =>
            recipient.messageId &&
            ["DELIVERED", "READ"].includes(
              messageStatuses.get(recipient.messageId) ?? "",
            ),
        ).length,
        failed: recipients.filter((recipient) => recipient.status === "FAILED")
          .length,
        pending: recipients.filter((recipient) =>
          ["PENDING", "QUEUED"].includes(recipient.status),
        ).length,
      },
    }));
  }

  async preview(
    user: AuthUser,
    input: { groupIds?: string[]; contactIds?: string[] },
  ) {
    const contacts = await this.resolveContacts(user, input);
    return { total: contacts.length, contacts };
  }

  async create(
    user: AuthUser,
    input: {
      name: string;
      body: string;
      instanceId: string;
      groupIds?: string[];
      contactIds?: string[];
      delayMs?: number;
      batchSize?: number;
      scheduledAt?: string;
    },
  ) {
    if (!input.body?.trim())
      throw new BadRequestException("campaign_body_required");
    const instance = await this.db.whatsappInstance.findFirst({
      where: { id: input.instanceId, tenantId: user.tenantId },
    });
    if (!instance) throw new NotFoundException("instance_not_found");
    const contacts = await this.resolveContacts(user, input);
    if (!contacts.length)
      throw new BadRequestException("campaign_has_no_recipients");
    const groupIds = Array.from(new Set(input.groupIds ?? []));
    const groups = await this.db.contactGroup.findMany({
      where: { tenantId: user.tenantId, id: { in: groupIds } },
      select: { id: true },
    });
    return this.db.blastCampaign.create({
      data: {
        tenantId: user.tenantId,
        name: input.name.trim(),
        body: htmlToWhatsApp(input.body),
        instanceId: instance.id,
        delayMs: Math.max(0, Math.min(60000, input.delayMs ?? 1500)),
        batchSize: Math.max(1, Math.min(500, input.batchSize ?? 20)),
        scheduledAt: input.scheduledAt
          ? new Date(input.scheduledAt)
          : undefined,
        groups: { create: groups.map((group) => ({ groupId: group.id })) },
        recipients: {
          create: contacts.map((contact, position) => ({
            contactId: contact.id,
            position,
            phone: contact.phone,
            name: contact.name,
          })),
        },
      },
      include: { _count: { select: { recipients: true } } },
    });
  }

  async queueCampaign(user: AuthUser, id: string) {
    const campaign = await this.db.blastCampaign.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!campaign) throw new NotFoundException("campaign_not_found");
    if (["QUEUED", "RUNNING", "COMPLETED"].includes(campaign.status))
      throw new BadRequestException("campaign_already_processed");
    const updated = await this.db.blastCampaign.update({
      where: { id },
      data: { status: "QUEUED", error: null },
    });
    const delay = updated.scheduledAt
      ? Math.max(0, updated.scheduledAt.getTime() - Date.now())
      : 0;
    await this.queue.add(
      "run-campaign",
      { campaignId: id },
      {
        delay,
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
    return updated;
  }

  async get(user: AuthUser, id: string) {
    const campaign = await this.db.blastCampaign.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        instance: true,
        recipients: { orderBy: [{ position: "asc" }, { name: "asc" }] },
      },
    });
    if (!campaign) throw new NotFoundException("campaign_not_found");
    const messageIds = campaign.recipients
      .map((recipient) => recipient.messageId)
      .filter((messageId): messageId is string => Boolean(messageId));
    const messages = messageIds.length
      ? await this.db.message.findMany({
          where: { id: { in: messageIds }, tenantId: user.tenantId },
          select: { id: true, status: true, createdAt: true },
        })
      : [];
    const messageById = new Map(
      messages.map((message) => [message.id, message]),
    );
    return {
      ...campaign,
      recipients: campaign.recipients.map((recipient) => ({
        ...recipient,
        messageStatus: recipient.messageId
          ? (messageById.get(recipient.messageId)?.status ?? null)
          : null,
        messageCreatedAt: recipient.messageId
          ? (messageById.get(recipient.messageId)?.createdAt ?? null)
          : null,
      })),
    };
  }

  async retryFailed(user: AuthUser, id: string) {
    const campaign = await this.db.blastCampaign.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!campaign) throw new NotFoundException("campaign_not_found");
    if (campaign.status === "RUNNING")
      throw new BadRequestException("campaign_is_running");
    const retryableWhere = {
      campaignId: id,
      status: "FAILED" as const,
      NOT: {
        error: {
          contains: "tidak terdaftar",
          mode: "insensitive" as const,
        },
      },
    };
    const failed = await this.db.blastRecipient.count({
      where: retryableWhere,
    });
    if (!failed)
      throw new BadRequestException("campaign_has_no_failed_recipients");
    await this.db.$transaction([
      this.db.blastRecipient.updateMany({
        where: retryableWhere,
        data: {
          status: "PENDING",
          error: null,
          messageId: null,
          queuedAt: null,
          sentAt: null,
        },
      }),
      this.db.blastCampaign.update({
        where: { id },
        data: {
          status: "QUEUED",
          error: null,
          completedAt: null,
          scheduledAt: null,
        },
      }),
    ]);
    await this.queue.add(
      "run-campaign",
      { campaignId: id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
    return { id, retried: failed, status: "QUEUED" };
  }

  async cancel(user: AuthUser, id: string) {
    const campaign = await this.db.blastCampaign.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!campaign) throw new NotFoundException("campaign_not_found");
    if (["COMPLETED", "CANCELLED"].includes(campaign.status))
      throw new BadRequestException("campaign_cannot_be_cancelled");
    return this.db.blastCampaign.update({
      where: { id },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
  }

  private async resolveContacts(
    user: AuthUser,
    input: { groupIds?: string[]; contactIds?: string[] },
  ) {
    const ids = Array.from(new Set(input.contactIds ?? []));
    const groups = Array.from(new Set(input.groupIds ?? []));
    const members = groups.length
      ? await this.db.contactGroupMember.findMany({
          where: {
            groupId: { in: groups },
            group: { tenantId: user.tenantId },
          },
          select: { contactId: true },
          orderBy: { createdAt: "asc" },
        })
      : [];
    const allIds = Array.from(
      new Set([...ids, ...members.map((member) => member.contactId)]),
    );
    const contacts = await this.db.contact.findMany({
      where: { tenantId: user.tenantId, id: { in: allIds } },
      select: { id: true, name: true, phone: true },
    });
    const contactsById = new Map(
      contacts.map((contact) => [contact.id, contact]),
    );
    return allIds
      .map((id) => contactsById.get(id))
      .filter((contact): contact is (typeof contacts)[number] =>
        Boolean(contact),
      );
  }
}
