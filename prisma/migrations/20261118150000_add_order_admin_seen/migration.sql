ALTER TABLE "Order" ADD COLUMN "adminSeenAt" TIMESTAMP(3);

-- Les commandes antérieures à cette fonctionnalité ne sont pas de nouvelles notifications.
UPDATE "Order" SET "adminSeenAt" = CURRENT_TIMESTAMP;

CREATE INDEX "Order_adminSeenAt_idx" ON "Order"("adminSeenAt");
