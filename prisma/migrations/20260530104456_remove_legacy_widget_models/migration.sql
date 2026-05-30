/*
  Warnings:

  - You are about to drop the `DeviceWidget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Widget` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeviceWidget" DROP CONSTRAINT "DeviceWidget_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "DeviceWidget" DROP CONSTRAINT "DeviceWidget_widgetId_fkey";

-- DropForeignKey
ALTER TABLE "Widget" DROP CONSTRAINT "Widget_userId_fkey";

-- DropTable
DROP TABLE "DeviceWidget";

-- DropTable
DROP TABLE "Widget";
