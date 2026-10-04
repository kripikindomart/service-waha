-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventKey_key" ON "WebhookEvent"("eventKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_createdAt_idx" ON "WebhookEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_instanceId_createdAt_idx" ON "WebhookEvent"("instanceId", "createdAt");

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
