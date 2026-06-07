-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_userId_fkey";

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "postClaimSecret" TEXT;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
