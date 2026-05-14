-- AlterTable
ALTER TABLE "PluginVersion" ADD COLUMN     "executionMode" TEXT NOT NULL DEFAULT 'local',
ALTER COLUMN "installPath" DROP NOT NULL;
