/*
  Warnings:

  - You are about to drop the `PluginConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PluginInstallEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PluginConfig" DROP CONSTRAINT "PluginConfig_pluginId_fkey";

-- DropForeignKey
ALTER TABLE "PluginInstallEvent" DROP CONSTRAINT "PluginInstallEvent_pluginId_fkey";

-- DropForeignKey
ALTER TABLE "PluginInstallEvent" DROP CONSTRAINT "PluginInstallEvent_pluginVersionId_fkey";

-- DropTable
DROP TABLE "PluginConfig";

-- DropTable
DROP TABLE "PluginInstallEvent";
