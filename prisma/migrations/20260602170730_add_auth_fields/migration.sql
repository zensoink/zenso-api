-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Device" ADD COLUMN "deviceSecretHash" TEXT,
ADD COLUMN "deviceTokenVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "revokedAt" TIMESTAMP(3);
