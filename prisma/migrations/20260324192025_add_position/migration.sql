-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "palette" TEXT[] DEFAULT ARRAY['#000000', '#ffffff', '#00ff00', '#0000ff', '#ff0000', '#ffff00', '#ff8000']::TEXT[];

-- AlterTable
ALTER TABLE "DeviceWidget" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
