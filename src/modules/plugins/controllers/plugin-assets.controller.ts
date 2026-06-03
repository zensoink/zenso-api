import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';

import { PluginStorageService } from '../services/plugin-storage.service';

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.js',
  '.css',
  '.json',
]);

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

@ApiExcludeController()
@Controller('plugins/assets')
export class PluginAssetsController {
  constructor(private readonly pluginStorageService: PluginStorageService) {}

  @Get(':slug/:version/*filePath')
  @ApiOperation({ summary: 'Serve plugin asset file (public)' })
  async serve(
    @Param('slug') slug: string,
    @Param('version') version: string,
    @Param('filePath') filePath: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const versionDir = this.pluginStorageService.getVersionPath(slug, version);
    const resolved = path.resolve(versionDir, filePath);

    if (!resolved.startsWith(versionDir)) {
      throw new NotFoundException('Invalid asset path');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new NotFoundException(`File type "${ext}" not allowed`);
    }

    let content: Buffer;
    try {
      content = await fs.readFile(resolved);
    } catch {
      throw new NotFoundException(`Asset not found: ${filePath}`);
    }

    const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return new StreamableFile(content);
  }
}
