-- AlterTable: Make userId optional in Device (drop NOT NULL)
ALTER TABLE "Device" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable: Add bootstrap/claim fields to Device
ALTER TABLE "Device" ADD COLUMN "bootstrapSecretHash" TEXT;
ALTER TABLE "Device" ADD COLUMN "claimStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Device" ADD COLUMN "claimedAt" TIMESTAMP(3);
ALTER TABLE "Device" ADD COLUMN "lastBootstrapAt" TIMESTAMP(3);
ALTER TABLE "Device" ADD COLUMN "hardwareInfoJson" JSONB;
ALTER TABLE "Device" ADD COLUMN "displayInfoJson" JSONB;

-- CreateIndex for Device.claimStatus (from @@index([claimStatus]))
CREATE INDEX "Device_claimStatus_idx" ON "Device"("claimStatus");

-- CreateTable: ClaimSession
CREATE TABLE "ClaimSession" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "claimedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for ClaimSession
CREATE UNIQUE INDEX "ClaimSession_nonceHash_key" ON "ClaimSession"("nonceHash");
CREATE INDEX "ClaimSession_deviceId_idx" ON "ClaimSession"("deviceId");
CREATE INDEX "ClaimSession_status_idx" ON "ClaimSession"("status");
CREATE INDEX "ClaimSession_expiresAt_idx" ON "ClaimSession"("expiresAt");

-- AddForeignKey: ClaimSession.deviceId -> Device.id
ALTER TABLE "ClaimSession" ADD CONSTRAINT "ClaimSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ClaimSession.claimedByUserId -> User.id
ALTER TABLE "ClaimSession" ADD CONSTRAINT "ClaimSession_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
