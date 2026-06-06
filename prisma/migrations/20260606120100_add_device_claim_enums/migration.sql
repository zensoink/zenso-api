-- CreateEnum
CREATE TYPE "DeviceClaimStatus" AS ENUM ('pending', 'claimed', 'expired');

-- AlterTable: cast existing TEXT to enum
ALTER TABLE "Device" ALTER COLUMN "claimStatus" DROP DEFAULT;
ALTER TABLE "Device" ALTER COLUMN "claimStatus" TYPE "DeviceClaimStatus" USING "claimStatus"::text::"DeviceClaimStatus";
ALTER TABLE "Device" ALTER COLUMN "claimStatus" SET DEFAULT 'pending';

-- CreateEnum
CREATE TYPE "ClaimSessionStatus" AS ENUM ('pending', 'used', 'expired', 'cancelled');

-- AlterTable: cast existing TEXT to enum
ALTER TABLE "ClaimSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ClaimSession" ALTER COLUMN "status" TYPE "ClaimSessionStatus" USING "status"::text::"ClaimSessionStatus";
ALTER TABLE "ClaimSession" ALTER COLUMN "status" SET DEFAULT 'pending';
