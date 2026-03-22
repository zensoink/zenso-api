-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "widgetId" INTEGER;

-- CreateTable
CREATE TABLE "Widget" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
