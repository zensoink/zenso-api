import { PrismaService } from '@core/prisma';
import { toPrismaJson } from '@core/prisma/utils';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PluginStorageService } from './plugin-storage.service';
import { PluginValidatorService } from './plugin-validator.service';
import { PluginZipService } from './plugin-zip.service';

interface SourceInfo {
  sourceRef?: string;
  sourceUrl?: string;
}

@Injectable()
export class PluginImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginZipService: PluginZipService,
    private readonly pluginValidatorService: PluginValidatorService,
    private readonly pluginStorageService: PluginStorageService
  ) {}

  async importFromZipUpload(file: Express.Multer.File) {
    const tempZipPath = await this.pluginZipService.saveUploadToTemp(file);

    return this.importFromZipPath(tempZipPath, { sourceRef: file.originalname });
  }

  async importFromRegistryZip(zipBuffer: Buffer, pluginId: string, version: string, sourceUrl: string) {
    const tempZipPath = await this.pluginZipService.saveBufferToTemp(zipBuffer, `${pluginId}-${version}.zip`);

    return this.importFromZipPath(tempZipPath, { sourceUrl });
  }

  private async importFromZipPath(tempZipPath: string, sourceInfo: SourceInfo) {
    const extractedDir = await this.pluginZipService.extractZipToTemp(tempZipPath);

    const validation = await this.pluginValidatorService.validateExtractedPlugin(extractedDir);
    const manifest = validation.manifest;
    const { version } = manifest;

    const pluginSlug = this.pluginValidatorService.toFilesystemSlug(manifest.id);

    await this.pluginStorageService.ensurePluginDirectories(pluginSlug, version);

    const finalPath = this.pluginStorageService.getVersionPath(pluginSlug, version);

    const result = await this.prisma.$transaction(async tx => {
      const plugin = await tx.plugin.upsert({
        where: { manifestId: manifest.id },
        update: {
          name: manifest.name,
          authorName: manifest.author?.name ?? null,
          configSchema: toPrismaJson(manifest.config_schema ?? Prisma.JsonNull),
          updatedAt: new Date(),
        },
        create: {
          manifestId: manifest.id,
          slug: pluginSlug,
          name: manifest.name,
          authorName: manifest.author?.name ?? null,
          configSchema: toPrismaJson(manifest.config_schema ?? Prisma.JsonNull),
          sourceType: 'zip',
        },
      });

      const pluginVersion = await tx.pluginVersion.create({
        data: {
          pluginId: plugin.id,
          version,
          manifestJson: toPrismaJson(manifest),
          sourceUrl: sourceInfo.sourceUrl ?? null,
          sourceRef: sourceInfo.sourceRef ?? null,
          checksumSha256: validation.checksumSha256,
          signatureStatus: 'none',
          installPath: finalPath,
          executionMode: 'local',
          status: 'installed',
        },
      });

      return { plugin, pluginVersion };
    });

    await this.pluginStorageService.moveExtractedPluginToVersionPath(extractedDir, pluginSlug, version);

    return {
      ok: true,
      pluginId: result.plugin.manifestId,
      slug: result.plugin.slug,
      version: result.pluginVersion.version,
      status: result.pluginVersion.status,
    };
  }
}
