-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "firmwareVersion" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
