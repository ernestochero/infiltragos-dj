-- Add User table
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL
);

-- Add votes column to Request
ALTER TABLE "Request" ADD COLUMN "votes" INTEGER NOT NULL DEFAULT 0;
