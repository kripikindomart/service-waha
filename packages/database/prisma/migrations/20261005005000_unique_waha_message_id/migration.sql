-- Prevent message and message.any webhook deliveries from creating duplicates.
CREATE UNIQUE INDEX "Message_tenantId_wahaMessageId_key" ON "Message"("tenantId", "wahaMessageId");
