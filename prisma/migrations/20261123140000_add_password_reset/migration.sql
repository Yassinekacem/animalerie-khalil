ALTER TABLE "User"
  ADD COLUMN "passwordResetTokenHash" TEXT,
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetSentAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetWindowAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetSendCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "User_passwordResetTokenHash_key" ON "User"("passwordResetTokenHash");
