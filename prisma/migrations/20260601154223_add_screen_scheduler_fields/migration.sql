-- AlterTable
ALTER TABLE "Screen" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "refreshRate" INTEGER NOT NULL DEFAULT 300;
