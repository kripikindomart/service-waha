-- CreateEnum
CREATE TYPE "AiAgentScope" AS ENUM ('GLOBAL', 'CONTACT', 'GROUP');

-- CreateEnum
CREATE TYPE "AiAgentActivationMode" AS ENUM ('ALWAYS', 'KEYWORD', 'MANUAL');

-- CreateEnum
CREATE TYPE "AiAgentMatchType" AS ENUM ('EXACT', 'CONTAINS', 'REGEX');

-- CreateEnum
CREATE TYPE "AiAgentTargetType" AS ENUM ('CONTACT', 'GROUP');

-- CreateEnum
CREATE TYPE "AiAgentSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'HANDED_OFF', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AiAgentActivatedBy" AS ENUM ('ALWAYS', 'KEYWORD', 'MANUAL', 'API');

-- CreateEnum
CREATE TYPE "AiAgentGroupResponseMode" AS ENUM ('ALL', 'MENTION_ONLY', 'REPLY_ONLY', 'KEYWORD_ONLY');

-- CreateEnum
CREATE TYPE "AiAgentGroupMemoryMode" AS ENUM ('SHARED', 'PER_MEMBER');

-- CreateEnum
CREATE TYPE "AiAgentExecutionStatus" AS ENUM ('PROCESSING', 'QUEUED', 'COMPLETED', 'FALLBACK', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentKnowledgeType" AS ENUM ('TEXT', 'DATA_SHEET', 'EXTERNAL_API', 'CONTACTS', 'GROUP_PARTICIPANTS', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AgentDraftStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'CONVERTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentBuilderSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentEvaluationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "aiProviderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "AiAgentScope" NOT NULL DEFAULT 'GLOBAL',
    "activationMode" "AiAgentActivationMode" NOT NULL DEFAULT 'KEYWORD',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "allInstances" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT,
    "systemPrompt" TEXT NOT NULL DEFAULT '',
    "agentPrompt" TEXT NOT NULL DEFAULT '',
    "fallbackResponse" TEXT NOT NULL DEFAULT '',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "historyLimit" INTEGER NOT NULL DEFAULT 10,
    "sessionTtlSeconds" INTEGER NOT NULL DEFAULT 1800,
    "extendSessionOnMessage" BOOLEAN NOT NULL DEFAULT true,
    "activationMatchType" "AiAgentMatchType" NOT NULL DEFAULT 'EXACT',
    "activationKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deactivationMatchType" "AiAgentMatchType" NOT NULL DEFAULT 'EXACT',
    "deactivationKeywords" TEXT[] DEFAULT ARRAY['/stop-ai']::TEXT[],
    "consumeActivationMessage" BOOLEAN NOT NULL DEFAULT true,
    "includePreviousContext" BOOLEAN NOT NULL DEFAULT false,
    "openingMessage" TEXT,
    "closingMessage" TEXT,
    "groupResponseMode" "AiAgentGroupResponseMode" NOT NULL DEFAULT 'MENTION_ONLY',
    "groupMemoryMode" "AiAgentGroupMemoryMode" NOT NULL DEFAULT 'PER_MEMBER',
    "scopeContract" JSONB NOT NULL DEFAULT '{}',
    "memoryPolicy" JSONB NOT NULL DEFAULT '{}',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentInstance" (
    "agentId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAgentInstance_pkey" PRIMARY KEY ("agentId","instanceId")
);

-- CreateTable
CREATE TABLE "AiAgentTarget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "instanceId" TEXT,
    "targetType" "AiAgentTargetType" NOT NULL,
    "targetKey" TEXT NOT NULL,
    "displayName" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "participantId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "activeScopeKey" TEXT,
    "status" "AiAgentSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedBy" "AiAgentActivatedBy" NOT NULL,
    "memorySummary" TEXT,
    "handoffUserId" TEXT,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "handedOffAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentKnowledgeSource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dataSheetId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AgentKnowledgeType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "encryptedSecret" TEXT,
    "encryptionIv" TEXT,
    "authTag" TEXT,
    "refreshMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "refreshIntervalSeconds" INTEGER,
    "cachedContent" JSONB,
    "contentVersion" INTEGER NOT NULL DEFAULT 0,
    "lastStatus" TEXT NOT NULL DEFAULT 'UNCHECKED',
    "lastError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentKnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentKnowledge" (
    "agentId" TEXT NOT NULL,
    "knowledgeSourceId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "maxRows" INTEGER NOT NULL DEFAULT 50,
    "maxCharacters" INTEGER NOT NULL DEFAULT 12000,
    "filterTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAgentKnowledge_pkey" PRIMARY KEY ("agentId","knowledgeSourceId")
);

-- CreateTable
CREATE TABLE "AiAgentExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "instanceId" TEXT NOT NULL,
    "aiProviderId" TEXT,
    "chatId" TEXT NOT NULL,
    "inboundMessageId" TEXT NOT NULL,
    "outboundMessageId" TEXT,
    "status" "AiAgentExecutionStatus" NOT NULL DEFAULT 'PROCESSING',
    "model" TEXT,
    "credentialHint" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "scopeDecision" JSONB,
    "knowledgeTrace" JSONB,
    "errorCode" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "name" TEXT NOT NULL,
    "status" "AgentDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL DEFAULT '{}',
    "approvedAt" TIMESTAMP(3),
    "convertedAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentBuilderSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "draftId" TEXT,
    "userId" TEXT,
    "status" "AgentBuilderSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStep" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentBuilderSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentBuilderMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentBuilderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvaluationCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT,
    "draftId" TEXT,
    "name" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expected" JSONB NOT NULL,
    "status" "AgentEvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "lastResult" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentEvaluationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAgentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAgent_tenantId_enabled_priority_idx" ON "AiAgent"("tenantId", "enabled", "priority");

-- CreateIndex
CREATE INDEX "AiAgent_tenantId_scope_activationMode_idx" ON "AiAgent"("tenantId", "scope", "activationMode");

-- CreateIndex
CREATE INDEX "AiAgent_aiProviderId_idx" ON "AiAgent"("aiProviderId");

-- CreateIndex
CREATE INDEX "AiAgentInstance_tenantId_instanceId_idx" ON "AiAgentInstance"("tenantId", "instanceId");

-- CreateIndex
CREATE INDEX "AiAgentTarget_tenantId_targetType_targetKey_idx" ON "AiAgentTarget"("tenantId", "targetType", "targetKey");

-- CreateIndex
CREATE INDEX "AiAgentTarget_instanceId_idx" ON "AiAgentTarget"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgentTarget_agentId_targetType_targetKey_key" ON "AiAgentTarget"("agentId", "targetType", "targetKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgentSession_activeScopeKey_key" ON "AiAgentSession"("activeScopeKey");

-- CreateIndex
CREATE INDEX "AiAgentSession_tenantId_instanceId_chatId_status_idx" ON "AiAgentSession"("tenantId", "instanceId", "chatId", "status");

-- CreateIndex
CREATE INDEX "AiAgentSession_agentId_status_expiresAt_idx" ON "AiAgentSession"("agentId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "AgentKnowledgeSource_tenantId_type_enabled_idx" ON "AgentKnowledgeSource"("tenantId", "type", "enabled");

-- CreateIndex
CREATE INDEX "AgentKnowledgeSource_dataSheetId_idx" ON "AgentKnowledgeSource"("dataSheetId");

-- CreateIndex
CREATE INDEX "AiAgentKnowledge_knowledgeSourceId_idx" ON "AiAgentKnowledge"("knowledgeSourceId");

-- CreateIndex
CREATE INDEX "AiAgentExecution_agentId_chatId_createdAt_idx" ON "AiAgentExecution"("agentId", "chatId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAgentExecution_tenantId_status_createdAt_idx" ON "AiAgentExecution"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AiAgentExecution_sessionId_idx" ON "AiAgentExecution"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgentExecution_tenantId_inboundMessageId_key" ON "AiAgentExecution"("tenantId", "inboundMessageId");

-- CreateIndex
CREATE INDEX "AgentDraft_tenantId_status_updatedAt_idx" ON "AgentDraft"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentBuilderSession_tenantId_status_updatedAt_idx" ON "AgentBuilderSession"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentBuilderSession_draftId_idx" ON "AgentBuilderSession"("draftId");

-- CreateIndex
CREATE INDEX "AgentBuilderMessage_sessionId_createdAt_idx" ON "AgentBuilderMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentEvaluationCase_tenantId_status_idx" ON "AgentEvaluationCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AgentEvaluationCase_agentId_idx" ON "AgentEvaluationCase"("agentId");

-- CreateIndex
CREATE INDEX "AgentEvaluationCase_draftId_idx" ON "AgentEvaluationCase"("draftId");

-- CreateIndex
CREATE INDEX "AiAgentVersion_tenantId_createdAt_idx" ON "AiAgentVersion"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgentVersion_agentId_version_key" ON "AiAgentVersion"("agentId", "version");

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_aiProviderId_fkey" FOREIGN KEY ("aiProviderId") REFERENCES "AiProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentInstance" ADD CONSTRAINT "AiAgentInstance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentInstance" ADD CONSTRAINT "AiAgentInstance_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentInstance" ADD CONSTRAINT "AiAgentInstance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTarget" ADD CONSTRAINT "AiAgentTarget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTarget" ADD CONSTRAINT "AiAgentTarget_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentTarget" ADD CONSTRAINT "AiAgentTarget_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentSession" ADD CONSTRAINT "AiAgentSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentSession" ADD CONSTRAINT "AiAgentSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentSession" ADD CONSTRAINT "AiAgentSession_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentSession" ADD CONSTRAINT "AiAgentSession_handoffUserId_fkey" FOREIGN KEY ("handoffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledgeSource" ADD CONSTRAINT "AgentKnowledgeSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledgeSource" ADD CONSTRAINT "AgentKnowledgeSource_dataSheetId_fkey" FOREIGN KEY ("dataSheetId") REFERENCES "DataSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentKnowledge" ADD CONSTRAINT "AiAgentKnowledge_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentKnowledge" ADD CONSTRAINT "AiAgentKnowledge_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "AgentKnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentExecution" ADD CONSTRAINT "AiAgentExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentExecution" ADD CONSTRAINT "AiAgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentExecution" ADD CONSTRAINT "AiAgentExecution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiAgentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentExecution" ADD CONSTRAINT "AiAgentExecution_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentExecution" ADD CONSTRAINT "AiAgentExecution_aiProviderId_fkey" FOREIGN KEY ("aiProviderId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDraft" ADD CONSTRAINT "AgentDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDraft" ADD CONSTRAINT "AgentDraft_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBuilderSession" ADD CONSTRAINT "AgentBuilderSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBuilderSession" ADD CONSTRAINT "AgentBuilderSession_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "AgentDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBuilderSession" ADD CONSTRAINT "AgentBuilderSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentBuilderMessage" ADD CONSTRAINT "AgentBuilderMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentBuilderSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvaluationCase" ADD CONSTRAINT "AgentEvaluationCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvaluationCase" ADD CONSTRAINT "AgentEvaluationCase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvaluationCase" ADD CONSTRAINT "AgentEvaluationCase_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "AgentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentVersion" ADD CONSTRAINT "AiAgentVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentVersion" ADD CONSTRAINT "AiAgentVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentVersion" ADD CONSTRAINT "AiAgentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve existing AI automation configuration as reviewable drafts. The
-- legacy rule remains active and unchanged until a tenant explicitly converts
-- and enables the new agent.
INSERT INTO "AgentDraft" (
    "id", "tenantId", "name", "status", "config", "createdAt", "updatedAt"
)
SELECT
    CONCAT('legacy-ai-', MD5(rule."id")),
    rule."tenantId",
    CONCAT('[Migrasi] ', rule."name"),
    'DRAFT'::"AgentDraftStatus",
    JSONB_BUILD_OBJECT(
        'schemaVersion', 1,
        'source', 'AUTOMATION_RULE',
        'legacyRuleId', rule."id",
        'name', rule."name",
        'activationMode', CASE WHEN rule."trigger" = 'any' THEN 'ALWAYS' ELSE 'KEYWORD' END,
        'activationKeywords', CASE WHEN rule."keyword" = '' THEN '[]'::JSONB ELSE JSONB_BUILD_ARRAY(rule."keyword") END,
        'aiProviderId', rule."aiProviderId",
        'aiModel', rule."aiModel",
        'systemPrompt', rule."systemPrompt",
        'fallbackResponse', rule."response",
        'temperature', rule."temperature",
        'maxTokens', rule."maxTokens",
        'historyLimit', rule."historyLimit",
        'enabledInLegacyAutomation', rule."enabled"
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "AutomationRule" rule
WHERE rule."responseMode" = 'AI';
