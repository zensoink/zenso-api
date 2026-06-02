import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { pluginManifestSchema } from '../interfaces/plugin-manifest.schema';

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

@Injectable()
export class PluginStorageService {
  private readonly rootDir: string;

  constructor(private readonly configService: ConfigService) {
    const rootDir = this.configService.get<string>('plugins.rootDir');

    if (!rootDir) {
      throw new Error('Missing plugins.rootDir configuration');
    }

    this.rootDir = rootDir;
  }

  getRootDir(): string {
    return this.rootDir;
  }

  getPluginRoot(slug: string): string {
    return path.join(this.rootDir, slug);
  }

  getVersionsRoot(slug: string): string {
    return path.join(this.getPluginRoot(slug), 'versions');
  }

  getVersionPath(slug: string, version: string): string {
    return path.join(this.getVersionsRoot(slug), version);
  }

  getManifestPath(slug: string, version: string): string {
    return path.join(this.getVersionPath(slug, version), 'manifest.json');
  }

  async ensurePluginDirectories(slug: string, version?: string): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.mkdir(this.getPluginRoot(slug), { recursive: true });
    await fs.mkdir(this.getVersionsRoot(slug), { recursive: true });

    if (version) {
      await fs.mkdir(this.getVersionPath(slug, version), { recursive: true });
    }
  }

  async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  async readManifest(slug: string, version: string) {
    const manifestPath = this.getManifestPath(slug, version);
    const exists = await this.pathExists(manifestPath);

    if (!exists) {
      throw new NotFoundException(`Manifest not found for plugin "${slug}" version "${version}"`);
    }

    const raw = await fs.readFile(manifestPath, 'utf-8');
    return pluginManifestSchema.parse(JSON.parse(raw));
  }

  async moveExtractedPluginToVersionPath(extractedDir: string, slug: string, version: string): Promise<void> {
    const targetDir = this.getVersionPath(slug, version);

    await fs.mkdir(path.dirname(targetDir), { recursive: true });
    await fs.rm(targetDir, { recursive: true, force: true });

    try {
      await fs.rename(extractedDir, targetDir);
    } catch (error: unknown) {
      if (!isErrnoException(error) || error.code !== 'EXDEV') {
        throw error;
      }

      await fs.cp(extractedDir, targetDir, { recursive: true });
      await fs.rm(extractedDir, { recursive: true, force: true });
    }
  }
}
