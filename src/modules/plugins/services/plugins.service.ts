import { PrismaService } from '@core/prisma';
import { toPrismaJson } from '@core/prisma/utils';
import { BadRequestException, Injectable } from '@nestjs/common';

import { InstallFromRegistryDTO } from '../dto/install-from-registry.dto';
import { RegistryPluginDetail } from '../interfaces/registry-types';
import { PluginImportService } from './plugin-import.service';
import { RegistryClient } from './registry-client.service';

@Injectable()
export class PluginsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registryClient: RegistryClient,
    private readonly pluginImportService: PluginImportService
  ) {}

  async getInstalledPlugins() {
    const plugins = await this.prisma.plugin.findMany({
      include: {
        versions: {
          orderBy: { installedAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return plugins.map(p => ({
      pluginId: p.manifestId,
      slug: p.slug,
      name: p.name,
      description: p.description,
      authorName: p.authorName,
      executionMode: p.versions[0]?.executionMode || 'local',
      selectedVersion: p.versions[0]?.version ?? null,
      installedVersions: p.versions.map(v => v.version),
      status: p.versions[0]?.status ?? 'unknown',
    }));
  }

  async installFromRegistry(dto: InstallFromRegistryDTO) {
    const detail = await this.registryClient.getPlugin(dto.pluginId);

    const version = dto.version ?? detail.distTags.latest ?? detail.versions[0]?.version;

    if (!version) {
      throw new BadRequestException('No version specified and registry provides no resolvable version');
    }

    if (detail.executionMode === 'protected') {
      return this.installProtectedPlugin(detail, version);
    }

    const zipBuffer = await this.registryClient.downloadPluginZip(detail.id, version);
    const downloadUrl = `${this.registryClient.baseUrl}/api/v1/plugins/${encodeURIComponent(detail.id)}/versions/${encodeURIComponent(version)}/download`;

    return this.pluginImportService.importFromRegistryZip(zipBuffer, detail.id, version, downloadUrl);
  }

  private async installProtectedPlugin(detail: RegistryPluginDetail, version: string) {
    const slug = detail.id.replaceAll('/', '__');

    const result = await this.prisma.$transaction(async tx => {
      const plugin = await tx.plugin.upsert({
        where: { manifestId: detail.id },
        update: {
          name: detail.name,
          description: detail.description ?? null,
          authorName: detail.author?.name ?? null,
          authorUrl: detail.author?.url ?? null,
          thumbnail: detail.thumbnail ?? null,
          coreMin: detail.core_min ?? null,
          license: detail.license ?? null,
          sourceType: 'protected',
          updatedAt: new Date(),
        },
        create: {
          manifestId: detail.id,
          slug,
          name: detail.name,
          description: detail.description ?? null,
          authorName: detail.author?.name ?? null,
          authorUrl: detail.author?.url ?? null,
          thumbnail: detail.thumbnail ?? null,
          coreMin: detail.core_min ?? null,
          license: detail.license ?? null,
          sourceType: 'protected',
        },
      });

      const pluginVersion = await tx.pluginVersion.create({
        data: {
          pluginId: plugin.id,
          version,
          manifestJson: toPrismaJson(detail),
          sourceUrl: `${this.registryClient.baseUrl}/api/v1/plugins/${encodeURIComponent(detail.id)}`,
          installPath: null,
          executionMode: 'protected',
          status: 'protected',
        },
      });

      return { plugin, pluginVersion };
    });

    return {
      ok: true,
      pluginId: result.plugin.manifestId,
      slug: result.plugin.slug,
      version: result.pluginVersion.version,
      status: result.pluginVersion.status,
    };
  }
}
