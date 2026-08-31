-- AlterTable (IF NOT EXISTS for idempotency - same drift as 20260825000000)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "refreshTokenHash" TEXT;
