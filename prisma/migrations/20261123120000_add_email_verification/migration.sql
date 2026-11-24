BEGIN;
ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationTokenHash" TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationSentAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationWindowAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationSendCount" INTEGER NOT NULL DEFAULT 0;

-- Preserve access for accounts registered before email verification existed.
-- New users have no default verification timestamp and must verify their email.
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "User_emailVerificationTokenHash_key" ON "User"("emailVerificationTokenHash");
COMMIT;
