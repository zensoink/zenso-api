-- ============================================================================
-- Fix schema/migration drift: columns and an enum referenced by schema.prisma
-- but never created by a migration. Same class of bug as the earlier
-- refreshTokenHash and Device.hardwareId incidents.
--
-- Root causes (commits that edited schema.prisma without generating a migration):
--   * Device.uid was renamed to Device.hardwareId (commit 7de8681, re-claim)
--   * Device.status (DeviceStatus) and ClaimSession.firmwareVersion /
--     hardwareInfoJson / displayInfoJson were added with no migration
--   * Device.bootstrapSecretHash was removed from schema but never dropped
--
-- Guarded with IF EXISTS / DO blocks so the file is safe to (re)apply whether
-- the live DB still has "uid" or was partially synced via `prisma db push`.
-- ============================================================================

-- 1) Device.uid -> Device.hardwareId rename
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Device' AND column_name = 'uid'
  ) THEN
    ALTER TABLE "Device" RENAME COLUMN "uid" TO "hardwareId";
  END IF;
END $$;

-- Drop old uid constraint/index (renamed away) and recreate per current schema
ALTER TABLE "Device" DROP CONSTRAINT IF EXISTS "Device_uid_key";
DROP INDEX IF EXISTS "Device_uid_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Device_userId_hardwareId_key" ON "Device"("userId", "hardwareId");
CREATE INDEX IF NOT EXISTS "Device_hardwareId_idx" ON "Device"("hardwareId");

-- Add ClaimSession.hardwareId (added in the same commit, no migration)
ALTER TABLE "ClaimSession" ADD COLUMN IF NOT EXISTS "hardwareId" TEXT;
CREATE INDEX IF NOT EXISTS "ClaimSession_hardwareId_idx" ON "ClaimSession"("hardwareId");

-- 2) DeviceStatus enum + Device.status column (enum + column never migrated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeviceStatus') THEN
    CREATE TYPE "DeviceStatus" AS ENUM ('active', 'dormant', 'inactive');
  END IF;
END $$;

ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "status" "DeviceStatus" NOT NULL DEFAULT 'active';

-- 3) ClaimSession.firmwareVersion / hardwareInfoJson / displayInfoJson (never migrated)
ALTER TABLE "ClaimSession" ADD COLUMN IF NOT EXISTS "firmwareVersion" TEXT;
ALTER TABLE "ClaimSession" ADD COLUMN IF NOT EXISTS "hardwareInfoJson" JSONB;
ALTER TABLE "ClaimSession" ADD COLUMN IF NOT EXISTS "displayInfoJson" JSONB;

-- 4) Schema-fidelity index @@index([status]) on Device (never migrated)
CREATE INDEX IF NOT EXISTS "Device_status_idx" ON "Device"("status");

-- 5) Drop orphan column bootstrapSecretHash (present in DB, removed from schema, no migration)
ALTER TABLE "Device" DROP COLUMN IF EXISTS "bootstrapSecretHash";
