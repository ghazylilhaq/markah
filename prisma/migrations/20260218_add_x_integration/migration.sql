-- Add source and externalId fields to Bookmark model
ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- Add unique constraint on [externalId, userId] for Bookmark
-- PostgreSQL unique index allows multiple NULLs naturally, so this is safe for nullable externalId
CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_externalId_userId_key"
  ON "Bookmark"("externalId", "userId");

-- Create XIntegration table
CREATE TABLE IF NOT EXISTS "XIntegration" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "xUserId"           TEXT NOT NULL,
  "xHandle"           TEXT NOT NULL,
  "accessToken"       TEXT NOT NULL,
  "refreshToken"      TEXT NOT NULL,
  "expiresAt"         TIMESTAMP(3) NOT NULL,
  "lastSyncedAt"      TIMESTAMP(3),
  "lastSyncedTweetId" TEXT,
  "syncEnabled"       BOOLEAN NOT NULL DEFAULT true,
  "retryCount"        INTEGER NOT NULL DEFAULT 0,
  "lastError"         TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "XIntegration_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on userId (one-to-one with User)
CREATE UNIQUE INDEX IF NOT EXISTS "XIntegration_userId_key" ON "XIntegration"("userId");

-- Add foreign key from XIntegration to User
ALTER TABLE "XIntegration"
  ADD CONSTRAINT "XIntegration_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
