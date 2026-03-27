/*
  Warnings:

  - You are about to drop the column `widgetId` on the `Device` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_widgetId_fkey";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "widgetId";

-- CreateTable
CREATE TABLE "DeviceWidget" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "widgetId" INTEGER NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 12,
    "h" INTEGER NOT NULL DEFAULT 12,

    CONSTRAINT "DeviceWidget_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeviceWidget" ADD CONSTRAINT "DeviceWidget_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceWidget" ADD CONSTRAINT "DeviceWidget_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
