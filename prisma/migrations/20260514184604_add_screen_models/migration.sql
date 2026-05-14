-- CreateTable
CREATE TABLE "Screen" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" INTEGER,
    "layoutType" TEXT NOT NULL DEFAULT 'full',
    "width" INTEGER NOT NULL DEFAULT 800,
    "height" INTEGER NOT NULL DEFAULT 480,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Screen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginInstance" (
    "id" SERIAL NOT NULL,
    "pluginId" INTEGER NOT NULL,
    "pluginVersionId" INTEGER,
    "name" TEXT NOT NULL,
    "configJson" JSONB,
    "executionMode" TEXT NOT NULL DEFAULT 'local',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PluginInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenSlot" (
    "id" SERIAL NOT NULL,
    "screenId" INTEGER NOT NULL,
    "pluginInstanceId" INTEGER NOT NULL,
    "slotKey" TEXT NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 0,
    "h" INTEGER NOT NULL DEFAULT 0,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "renderOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScreenSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenSlot_screenId_slotKey_key" ON "ScreenSlot"("screenId", "slotKey");

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginInstance" ADD CONSTRAINT "PluginInstance_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginInstance" ADD CONSTRAINT "PluginInstance_pluginVersionId_fkey" FOREIGN KEY ("pluginVersionId") REFERENCES "PluginVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginInstance" ADD CONSTRAINT "PluginInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenSlot" ADD CONSTRAINT "ScreenSlot_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenSlot" ADD CONSTRAINT "ScreenSlot_pluginInstanceId_fkey" FOREIGN KEY ("pluginInstanceId") REFERENCES "PluginInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
