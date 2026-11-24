CREATE TYPE "OrderNotificationStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'UNKNOWN', 'SKIPPED');
-- Historical orders must not generate new-order notifications.
ALTER TABLE "Order"
  ADD COLUMN "adminNotificationStatus" "OrderNotificationStatus" NOT NULL DEFAULT 'SKIPPED',
  ADD COLUMN "adminNotificationStartedAt" TIMESTAMP(3),
  ADD COLUMN "adminNotificationAttemptAt" TIMESTAMP(3),
  ADD COLUMN "adminNotificationSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ALTER COLUMN "adminNotificationStatus" SET DEFAULT 'PENDING';
