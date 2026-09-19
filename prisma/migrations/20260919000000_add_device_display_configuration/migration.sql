-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "displayProfile" TEXT NOT NULL DEFAULT 'spectra6_7in3',
ADD COLUMN     "epdConfig" JSONB,
ADD COLUMN     "refreshRate" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "rotation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "palettePreset" TEXT NOT NULL DEFAULT 'full',
ALTER COLUMN "palette" SET DEFAULT ARRAY['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00']::TEXT[];

-- DropForeignKey
ALTER TABLE "Screen" DROP CONSTRAINT IF EXISTS "Screen_deviceId_fkey";

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
