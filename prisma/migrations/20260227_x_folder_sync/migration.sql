-- Add isSyncManaged and xCollectionId fields to Folder model
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "isSyncManaged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Folder" ADD COLUMN IF NOT EXISTS "xCollectionId" TEXT;

-- Create XSyncStatus table
CREATE TABLE IF NOT EXISTS "XSyncStatus" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "lastSyncedAt"    TIMESTAMP(3),
  "status"          TEXT,
  "errorMessage"    TEXT,
  "collectionsNote" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "XSyncStatus_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on userId (one-to-one with User)
CREATE UNIQUE INDEX IF NOT EXISTS "XSyncStatus_userId_key" ON "XSyncStatus"("userId");

-- Add foreign key from XSyncStatus to User
ALTER TABLE "XSyncStatus"
  ADD CONSTRAINT "XSyncStatus_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
