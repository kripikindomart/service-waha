-- CreateEnum
CREATE TYPE "public"."BlastRecipientStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."BlastStatus" AS ENUM ('DRAFT', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Contact" ADD COLUMN     "customFields" JSONB;

-- CreateTable
CREATE TABLE "public"."AiProvider" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "defaultModel" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "roundRobin" BOOLEAN NOT NULL DEFAULT true,
    "credentialCursor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiProviderCredential" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastStatus" TEXT NOT NULL DEFAULT 'UNCHECKED',
    "lastError" TEXT,
    "lastLatencyMs" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiProviderModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutomationExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "inboundMessageId" TEXT NOT NULL,
    "outboundMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutomationRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "keyword" TEXT NOT NULL DEFAULT '',
    "response" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 5,
    "aiModel" TEXT,
    "aiProviderId" TEXT,
    "historyLimit" INTEGER NOT NULL DEFAULT 10,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "responseMode" TEXT NOT NULL DEFAULT 'STATIC',
    "systemPrompt" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlastCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "public"."BlastStatus" NOT NULL DEFAULT 'DRAFT',
    "instanceId" TEXT NOT NULL,
    "delayMs" INTEGER NOT NULL DEFAULT 1500,
    "batchSize" INTEGER NOT NULL DEFAULT 20,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlastCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlastCampaignGroup" (
    "campaignId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "BlastCampaignGroup_pkey" PRIMARY KEY ("campaignId","groupId")
);

-- CreateTable
CREATE TABLE "public"."BlastRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."BlastRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "messageId" TEXT,
    "queuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactGroupMember" (
    "groupId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactGroupMember_pkey" PRIMARY KEY ("groupId","contactId")
);

-- CreateTable
CREATE TABLE "public"."DataSheet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "fields" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiProvider_tenantId_enabled_idx" ON "public"."AiProvider"("tenantId" ASC, "enabled" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AiProvider_tenantId_prefix_key" ON "public"."AiProvider"("tenantId" ASC, "prefix" ASC);

-- CreateIndex
CREATE INDEX "AiProviderCredential_providerId_enabled_idx" ON "public"."AiProviderCredential"("providerId" ASC, "enabled" ASC);

-- CreateIndex
CREATE INDEX "AiProviderModel_providerId_enabled_idx" ON "public"."AiProviderModel"("providerId" ASC, "enabled" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderModel_providerId_modelId_key" ON "public"."AiProviderModel"("providerId" ASC, "modelId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "public"."ApiKey"("keyHash" ASC);

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_createdAt_idx" ON "public"."ApiKey"("tenantId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_revokedAt_expiresAt_idx" ON "public"."ApiKey"("tenantId" ASC, "revokedAt" ASC, "expiresAt" ASC);

-- CreateIndex
CREATE INDEX "AutomationExecution_ruleId_chatId_createdAt_idx" ON "public"."AutomationExecution"("ruleId" ASC, "chatId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_ruleId_inboundMessageId_key" ON "public"."AutomationExecution"("ruleId" ASC, "inboundMessageId" ASC);

-- CreateIndex
CREATE INDEX "AutomationExecution_tenantId_createdAt_idx" ON "public"."AutomationExecution"("tenantId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AutomationRule_aiProviderId_idx" ON "public"."AutomationRule"("aiProviderId" ASC);

-- CreateIndex
CREATE INDEX "AutomationRule_instanceId_enabled_idx" ON "public"."AutomationRule"("instanceId" ASC, "enabled" ASC);

-- CreateIndex
CREATE INDEX "AutomationRule_tenantId_enabled_priority_idx" ON "public"."AutomationRule"("tenantId" ASC, "enabled" ASC, "priority" ASC);

-- CreateIndex
CREATE INDEX "BlastCampaign_tenantId_status_createdAt_idx" ON "public"."BlastCampaign"("tenantId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "BlastCampaignGroup_groupId_idx" ON "public"."BlastCampaignGroup"("groupId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BlastRecipient_campaignId_contactId_key" ON "public"."BlastRecipient"("campaignId" ASC, "contactId" ASC);

-- CreateIndex
CREATE INDEX "BlastRecipient_campaignId_status_idx" ON "public"."BlastRecipient"("campaignId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_tenantId_name_key" ON "public"."ContactGroup"("tenantId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "ContactGroup_tenantId_updatedAt_idx" ON "public"."ContactGroup"("tenantId" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "ContactGroupMember_contactId_idx" ON "public"."ContactGroupMember"("contactId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DataSheet_tenantId_name_key" ON "public"."DataSheet"("tenantId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "DataSheet_tenantId_updatedAt_idx" ON "public"."DataSheet"("tenantId" ASC, "updatedAt" ASC);

-- AddForeignKey
ALTER TABLE "public"."AiProvider" ADD CONSTRAINT "AiProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiProviderCredential" ADD CONSTRAINT "AiProviderCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiProviderModel" ADD CONSTRAINT "AiProviderModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiKey" ADD CONSTRAINT "ApiKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationExecution" ADD CONSTRAINT "AutomationExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationRule" ADD CONSTRAINT "AutomationRule_aiProviderId_fkey" FOREIGN KEY ("aiProviderId") REFERENCES "public"."AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationRule" ADD CONSTRAINT "AutomationRule_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "public"."WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationRule" ADD CONSTRAINT "AutomationRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlastCampaign" ADD CONSTRAINT "BlastCampaign_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "public"."WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlastCampaign" ADD CONSTRAINT "BlastCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlastCampaignGroup" ADD CONSTRAINT "BlastCampaignGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."BlastCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlastCampaignGroup" ADD CONSTRAINT "BlastCampaignGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlastRecipient" ADD CONSTRAINT "BlastRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."BlastCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlastRecipient" ADD CONSTRAINT "BlastRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactGroup" ADD CONSTRAINT "ContactGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactGroupMember" ADD CONSTRAINT "ContactGroupMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactGroupMember" ADD CONSTRAINT "ContactGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DataSheet" ADD CONSTRAINT "DataSheet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
