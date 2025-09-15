-- CreateTable Contest (TIMESTAMP(3))
CREATE TABLE "Contest" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable Contestant (TIMESTAMP(3))
CREATE TABLE "Contestant" (
  "id" TEXT PRIMARY KEY,
  "contestId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "photoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contestant_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Contestant_contestId_slug_key" ON "Contestant" ("contestId", "slug");

-- CreateTable Poll (TIMESTAMP(3))
CREATE TABLE "Poll" (
  "id" TEXT PRIMARY KEY,
  "contestId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "round" INTEGER NOT NULL DEFAULT 1,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "nextPollId" TEXT,
  "nextSlot" INTEGER,
  CONSTRAINT "Poll_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Poll_nextPollId_fkey" FOREIGN KEY ("nextPollId") REFERENCES "Poll"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Poll_contestId_startAt_idx" ON "Poll" ("contestId", "startAt");
CREATE INDEX "Poll_contestId_endAt_idx" ON "Poll" ("contestId", "endAt");

-- CreateTable PollContestant
CREATE TABLE "PollContestant" (
  "id" TEXT PRIMARY KEY,
  "pollId" TEXT NOT NULL,
  "contestantId" TEXT NOT NULL,
  "tally" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PollContestant_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PollContestant_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PollContestant_pollId_contestantId_key" ON "PollContestant" ("pollId", "contestantId");
CREATE INDEX "PollContestant_pollId_idx" ON "PollContestant" ("pollId");

-- CreateTable PollVote (TIMESTAMP(3))
CREATE TABLE "PollVote" (
  "id" TEXT PRIMARY KEY,
  "pollId" TEXT NOT NULL,
  "contestantId" TEXT NOT NULL,
  "voterFingerprintHash" CHAR(64),
  "ipHash" CHAR(64) NOT NULL,
  "userAgentHash" CHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PollVote_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PollVote_pollId_createdAt_idx" ON "PollVote" ("pollId", "createdAt");
CREATE INDEX "PollVote_contestantId_idx" ON "PollVote" ("contestantId");
CREATE UNIQUE INDEX "PollVote_pollId_voterFingerprintHash_key" ON "PollVote" ("pollId", "voterFingerprintHash");

ALTER TABLE "Raffle" ALTER COLUMN "updatedAt" DROP DEFAULT;
