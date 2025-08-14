-- Initial schema
CREATE TABLE "Request" (
  "id" TEXT PRIMARY KEY,
  "songTitle" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "tableOrName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "fingerprintHash" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Vote" (
  "id" TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL REFERENCES "Request"("id") ON DELETE CASCADE,
  "ipHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
