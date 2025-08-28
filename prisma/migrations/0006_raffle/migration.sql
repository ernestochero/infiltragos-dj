-- Create Raffle table
CREATE TABLE "Raffle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "surveyId" TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "publicParticipants" BOOLEAN NOT NULL DEFAULT true,
  "publicDisplayQuestionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "Raffle_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create RaffleEntry table
CREATE TABLE "RaffleEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "raffleId" TEXT NOT NULL,
  "surveyResponseId" TEXT NOT NULL,
  "phoneNorm" VARCHAR(32),
  "ipHash" CHAR(64) NOT NULL,
  "userAgentShort" VARCHAR(200),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "RaffleEntry_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RaffleEntry_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RaffleEntry_raffleId_surveyResponseId_key" ON "RaffleEntry"("raffleId", "surveyResponseId");
CREATE UNIQUE INDEX "RaffleEntry_raffleId_ipHash_key" ON "RaffleEntry"("raffleId", "ipHash");
CREATE UNIQUE INDEX "RaffleEntry_raffleId_phoneNorm_key" ON "RaffleEntry"("raffleId", "phoneNorm");
CREATE INDEX "RaffleEntry_raffleId_createdAt_idx" ON "RaffleEntry"("raffleId", "createdAt");

-- Create RaffleWinner table
CREATE TABLE "RaffleWinner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "raffleId" TEXT NOT NULL,
  "raffleEntryId" TEXT NOT NULL UNIQUE,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "RaffleWinner_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RaffleWinner_raffleEntryId_fkey" FOREIGN KEY ("raffleEntryId") REFERENCES "RaffleEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RaffleWinner_raffleId_position_key" ON "RaffleWinner"("raffleId", "position");
CREATE INDEX "RaffleWinner_raffleId_idx" ON "RaffleWinner"("raffleId");
