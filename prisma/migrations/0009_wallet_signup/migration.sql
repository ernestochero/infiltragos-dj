-- CreateEnum
CREATE TYPE "WalletProfileStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "WalletCardState" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "WalletPassProvider" AS ENUM ('APPLE', 'GOOGLE');
CREATE TYPE "WalletLedgerSource" AS ENUM ('POS', 'MANUAL_ADJUSTMENT', 'PROMOTION', 'REWARD_REDEMPTION', 'SYSTEM');
CREATE TYPE "WalletRedemptionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WalletOtpChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateTable WalletSignup (TIMESTAMP(3))
CREATE TABLE "WalletSignup" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "phoneNumber" VARCHAR(32) NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "WalletSignup_phoneNumber_key" ON "WalletSignup" ("phoneNumber");
CREATE INDEX "WalletSignup_phoneNumber_idx" ON "WalletSignup" ("phoneNumber");
CREATE INDEX "WalletSignup_email_idx" ON "WalletSignup" ("email");

-- CreateTable WalletProfile
CREATE TABLE "WalletProfile" (
  "id" TEXT PRIMARY KEY,
  "signupId" TEXT,
  "status" "WalletProfileStatus" NOT NULL DEFAULT 'PENDING',
  "phoneNumber" VARCHAR(32) NOT NULL,
  "phoneVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "passwordHash" TEXT,
  "lastLoginAt" TIMESTAMP(3),
  "preferences" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "WalletProfile_signupId_key" ON "WalletProfile" ("signupId");
CREATE UNIQUE INDEX "WalletProfile_phoneNumber_key" ON "WalletProfile" ("phoneNumber");
CREATE INDEX "WalletProfile_phoneNumber_idx" ON "WalletProfile" ("phoneNumber");

-- CreateTable WalletCard
CREATE TABLE "WalletCard" (
  "id" TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "qrCode" TEXT,
  "passPublicUrl" TEXT,
  "cardState" "WalletCardState" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "WalletCard_profileId_key" ON "WalletCard" ("profileId");

-- CreateTable WalletPass
CREATE TABLE "WalletPass" (
  "id" TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "provider" "WalletPassProvider" NOT NULL,
  "passUrl" TEXT NOT NULL,
  "deviceToken" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "WalletPass_profileId_provider_idx" ON "WalletPass" ("profileId", "provider");

-- CreateTable PosTransaction
CREATE TABLE "PosTransaction" (
  "id" TEXT PRIMARY KEY,
  "externalId" TEXT,
  "profileId" TEXT,
  "totalAmountCents" INTEGER,
  "earnedPoints" INTEGER NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PosTransaction_externalId_key" ON "PosTransaction" ("externalId");
CREATE INDEX "PosTransaction_profileId_idx" ON "PosTransaction" ("profileId");
CREATE INDEX "PosTransaction_occurredAt_idx" ON "PosTransaction" ("occurredAt");

-- CreateTable WalletPointLedger
CREATE TABLE "WalletPointLedger" (
  "id" TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "source" "WalletLedgerSource" NOT NULL,
  "pointsDelta" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "referenceId" TEXT,
  "description" TEXT,
  "posTransactionId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "WalletPointLedger_profileId_createdAt_idx" ON "WalletPointLedger" ("profileId", "createdAt");
CREATE INDEX "WalletPointLedger_posTransactionId_idx" ON "WalletPointLedger" ("posTransactionId");

-- CreateTable WalletReward
CREATE TABLE "WalletReward" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "pointsRequired" INTEGER NOT NULL,
  "activeFrom" TIMESTAMP(3),
  "activeTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable WalletRedemption
CREATE TABLE "WalletRedemption" (
  "id" TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "pointsSpent" INTEGER NOT NULL,
  "status" "WalletRedemptionStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "WalletRedemption_profileId_redeemedAt_idx" ON "WalletRedemption" ("profileId", "redeemedAt");
CREATE INDEX "WalletRedemption_rewardId_idx" ON "WalletRedemption" ("rewardId");

-- CreateTable WalletOtpRequest
CREATE TABLE "WalletOtpRequest" (
  "id" TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "channel" "WalletOtpChannel" NOT NULL DEFAULT 'WHATSAPP',
  "destination" VARCHAR(64) NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "consumedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "WalletOtpRequest_profileId_expiresAt_idx" ON "WalletOtpRequest" ("profileId", "expiresAt");
CREATE INDEX "WalletOtpRequest_destination_idx" ON "WalletOtpRequest" ("destination");

-- AddForeignKeys
ALTER TABLE "WalletProfile"
  ADD CONSTRAINT "WalletProfile_signupId_fkey"
  FOREIGN KEY ("signupId") REFERENCES "WalletSignup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletCard"
  ADD CONSTRAINT "WalletCard_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "WalletProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletPass"
  ADD CONSTRAINT "WalletPass_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "WalletProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosTransaction"
  ADD CONSTRAINT "PosTransaction_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "WalletProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletPointLedger"
  ADD CONSTRAINT "WalletPointLedger_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "WalletProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletPointLedger"
  ADD CONSTRAINT "WalletPointLedger_posTransactionId_fkey"
  FOREIGN KEY ("posTransactionId") REFERENCES "PosTransaction"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletRedemption"
  ADD CONSTRAINT "WalletRedemption_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "WalletProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletRedemption"
  ADD CONSTRAINT "WalletRedemption_rewardId_fkey"
  FOREIGN KEY ("rewardId") REFERENCES "WalletReward"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletOtpRequest"
  ADD CONSTRAINT "WalletOtpRequest_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "WalletProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
