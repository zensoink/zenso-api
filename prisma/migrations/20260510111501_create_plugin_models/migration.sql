-- CreateTable
CREATE TABLE "Plugin" (
    "id" SERIAL NOT NULL,
    "manifestId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "authorName" TEXT,
    "authorUrl" TEXT,
    "thumbnail" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "coreMin" TEXT,
    "license" TEXT,
    "configSchema" JSONB,
    "sourceType" TEXT NOT NULL DEFAULT 'zip',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginVersion" (
    "id" SERIAL NOT NULL,
    "pluginId" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "sourceUrl" TEXT,
    "sourceRef" TEXT,
    "checksumSha256" TEXT,
    "signatureStatus" TEXT NOT NULL DEFAULT 'none',
    "installPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'installed',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PluginVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginConfig" (
    "id" SERIAL NOT NULL,
    "pluginId" INTEGER NOT NULL,
    "scopeType" TEXT NOT NULL DEFAULT 'global',
    "scopeId" TEXT,
    "configJson" JSONB NOT NULL,
    "secretsEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginInstallEvent" (
    "id" SERIAL NOT NULL,
    "pluginId" INTEGER NOT NULL,
    "pluginVersionId" INTEGER,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PluginInstallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_manifestId_key" ON "Plugin"("manifestId");

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_slug_key" ON "Plugin"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PluginVersion_pluginId_version_key" ON "PluginVersion"("pluginId", "version");

-- AddForeignKey
ALTER TABLE "PluginVersion" ADD CONSTRAINT "PluginVersion_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginConfig" ADD CONSTRAINT "PluginConfig_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginInstallEvent" ADD CONSTRAINT "PluginInstallEvent_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluginInstallEvent" ADD CONSTRAINT "PluginInstallEvent_pluginVersionId_fkey" FOREIGN KEY ("pluginVersionId") REFERENCES "PluginVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
