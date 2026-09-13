import * as path from 'node:path';

import { PrismaService } from '@core/prisma';
import { toPrismaJson } from '@core/prisma/utils';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Plugin, PluginVersion, Prisma } from '@prisma/client';
import { z } from 'zod';

import { InstallFromRegistryDTO } from '../dto/install-from-registry.dto';
import { RegistryPluginDetail } from '../interfaces/registry-types';
import { PluginImportService } from './plugin-import.service';
import { PluginStorageService } from './plugin-storage.service';
import { RegistryClient } from './registry-client.service';

const KNOWN_ICONS = [
  { file: 'favicon.ico', sizes: 'any', type: 'image/x-icon' },
  { file: 'favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  { file: 'favicon-16x16.png', sizes: '16x16', type: 'image/png' },
];

@Injectable()
export class PluginsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registryClient: RegistryClient,
    private readonly pluginImportService: PluginImportService,
    private readonly pluginStorageService: PluginStorageService
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

    return Promise.all(plugins.map(p => this.toInstalledPluginResponse(p)));
  }

  async getInstalledPluginById(id: number) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { installedAt: 'desc' },
        },
      },
    });

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return this.toInstalledPluginResponse(plugin);
  }

  private async toInstalledPluginResponse(plugin: Plugin & { versions: PluginVersion[] }) {
    const selected = plugin.versions[0];

    return {
      id: plugin.id,
      pluginId: plugin.manifestId,
      slug: plugin.slug,
      name: plugin.name,
      description: plugin.description,
      authorName: plugin.authorName,
      configSchema: plugin.configSchema ?? null,
      thumbnailUrl: await this.resolveVersionFileUrl(plugin.slug, selected?.version, plugin.thumbnail),
      icons: await this.resolveIcons(plugin.slug, selected?.version),
      readmeUrl: await this.resolveVersionFileUrl(plugin.slug, selected?.version, 'README.md'),
      executionMode: selected?.executionMode || 'local',
      selectedVersion: selected?.version ?? null,
      installedVersions: plugin.versions.map(v => v.version),
      status: selected?.status ?? 'unknown',
    };
  }

  private versionAssetUrl(slug: string, version: string, filePath: string): string {
    const segments = [slug, version, ...filePath.split('/')].map(segment => encodeURIComponent(segment));
    return `/plugins/assets/${segments.join('/')}`;
  }

  private async resolveVersionFileUrl(
    slug: string,
    version: string | undefined,
    filePath: string | null
  ): Promise<string | null> {
    if (!version || !filePath) {
      return null;
    }
    const versionDir = this.pluginStorageService.getVersionPath(slug, version);
    const resolved = path.resolve(versionDir, filePath);
    if (!resolved.startsWith(versionDir)) {
      return null;
    }
    const exists = await this.pluginStorageService.pathExists(resolved);
    return exists ? this.versionAssetUrl(slug, version, filePath) : null;
  }

  private async resolveIcons(slug: string, version: string | undefined) {
    if (!version) {
      return [];
    }
    const icons = [];
    for (const known of KNOWN_ICONS) {
      const url = await this.resolveVersionFileUrl(slug, version, known.file);
      if (url) {
        icons.push({ src: url, sizes: known.sizes, type: known.type });
      }
    }
    return icons;
  }

  async uninstall(id: number) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id },
      include: { instances: { include: { screenSlots: { select: { id: true } } } } },
    });
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    const assigned = plugin.instances.filter(instance => instance.screenSlots.length > 0);
    if (assigned.length > 0) {
      throw new ConflictException(
        `Plugin is in use by ${assigned.length} plugin instance(s) on screens. Remove them from screens first.`
      );
    }

    // Orphan instances (e.g. left behind by slot removal, which unassigns but never
    // deletes the instance) are removed automatically; only live assignments block.
    const orphanIds = plugin.instances.map(instance => instance.id);

    await this.prisma.$transaction([
      ...(orphanIds.length > 0 ? [this.prisma.pluginInstance.deleteMany({ where: { id: { in: orphanIds } } })] : []),
      this.prisma.pluginVersion.deleteMany({ where: { pluginId: id } }),
      this.prisma.plugin.delete({ where: { id } }),
    ]);

    await this.pluginStorageService.deletePluginDir(plugin.slug);

    return { message: 'Plugin uninstalled', pluginId: id, deletedInstances: orphanIds.length };
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

    const configSchema = z.record(z.string(), z.unknown()).safeParse(detail.config_schema).success
      ? toPrismaJson(detail.config_schema)
      : Prisma.JsonNull;

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
          configSchema,
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
          configSchema,
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
