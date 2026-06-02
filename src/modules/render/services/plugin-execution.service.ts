import { promises as fs, readFileSync } from 'node:fs';
import * as path from 'node:path';

import { PrismaService } from '@core/prisma';
import { PluginStorageService } from '@modules/plugins';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Liquid } from 'liquidjs';
import { z } from 'zod';

import { ContextAggregationService } from './context-aggregation.service';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

@Injectable()
export class PluginExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginStorageService: PluginStorageService,
    private readonly contextAggregationService: ContextAggregationService
  ) {}

  async execute(params: {
    screenId: number;
    pluginInstanceId: number;
    runtimeData?: Record<string, unknown>;
    width: number;
    height: number;
  }): Promise<{ html: string }> {
    const instance = await this.prisma.pluginInstance.findUnique({
      where: { id: params.pluginInstanceId },
      include: { plugin: true },
    });

    if (!instance) {
      throw new NotFoundException(`PluginInstance ${params.pluginInstanceId} not found`);
    }

    if (!instance.isEnabled) {
      throw new BadRequestException(`PluginInstance ${params.pluginInstanceId} is disabled`);
    }

    const pluginVersion = instance.pluginVersionId
      ? await this.prisma.pluginVersion.findUnique({
          where: { id: instance.pluginVersionId },
        })
      : await this.prisma.pluginVersion.findFirst({
          where: {
            pluginId: instance.pluginId,
            status: 'installed',
            executionMode: 'local',
          },
          orderBy: { installedAt: 'desc' },
        });

    if (!pluginVersion) {
      throw new NotFoundException(`No installed local version found for plugin "${instance.plugin.name}"`);
    }

    if (!pluginVersion.installPath) {
      throw new BadRequestException(
        `Plugin "${instance.plugin.name}" version ${pluginVersion.version} has no files on disk`
      );
    }

    await this.pluginStorageService.readManifest(instance.plugin.slug, pluginVersion.version);

    const templateDir = path.join(pluginVersion.installPath, 'src');
    const templatePath = path.join(templateDir, 'index.liquid');
    let template: string;

    try {
      template = await fs.readFile(templatePath, 'utf-8');
    } catch {
      throw new NotFoundException(`Template not found at ${templatePath} for plugin "${instance.plugin.name}"`);
    }

    const recordSchema = z.record(z.string(), z.unknown());
    const manifestJson = pluginVersion.manifestJson ? recordSchema.parse(pluginVersion.manifestJson) : undefined;

    const context = await this.contextAggregationService.buildContext({
      screenId: params.screenId,
      runtimeData: params.runtimeData,
      configJson: instance.configJson ? recordSchema.parse(instance.configJson) : {},
      manifestJson,
      pluginVersion: pluginVersion.version,
      width: params.width,
      height: params.height,
    });

    const liquid = new Liquid({ root: templateDir });

    const versionDir = pluginVersion.installPath;

    liquid.registerFilter('asset_url', (relativePath: string) => {
      const resolved = path.resolve(versionDir, relativePath);

      if (path.relative(versionDir, resolved).startsWith('..')) {
        return relativePath;
      }

      const ext = path.extname(resolved).toLowerCase();
      const mime = MIME_TYPES[ext] ?? 'application/octet-stream';

      try {
        const content = readFileSync(resolved);
        return `data:${mime};base64,${content.toString('base64')}`;
      } catch {
        return relativePath;
      }
    });

    const html = String(await liquid.parseAndRender(template, context));

    return { html };
  }
}
