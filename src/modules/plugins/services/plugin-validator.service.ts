import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { pluginManifestSchema } from '../interfaces/plugin-manifest.schema';
@Injectable()
export class PluginValidatorService {
  async validateExtractedPlugin(rootDir: string): Promise<{
    manifest: z.infer<typeof pluginManifestSchema>;
    checksumSha256: string;
  }> {
    const manifestPath = path.join(rootDir, 'manifest.json');
    const indexPath = path.join(rootDir, 'src', 'index.liquid');

    await this.assertExists(manifestPath, 'manifest.json is missing');
    await this.assertExists(indexPath, 'src/index.liquid is missing');

    await this.assertNoForbiddenFiles(rootDir);

    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = pluginManifestSchema.parse(JSON.parse(manifestRaw));

    const checksumSha256 = await this.computeDirectoryChecksum(rootDir);

    return { manifest, checksumSha256 };
  }

  toFilesystemSlug(manifestId: string): string {
    return manifestId.replaceAll('/', '__');
  }

  private async assertExists(filePath: string, message: string) {
    try {
      await fs.access(filePath);
    } catch {
      throw new BadRequestException(message);
    }
  }

  private async assertNoForbiddenFiles(rootDir: string) {
    const forbiddenExtensions = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.sh', '.exe'];
    const files = await this.walk(rootDir);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (forbiddenExtensions.includes(ext)) {
        throw new BadRequestException(`Forbidden file detected: ${file}`);
      }
    }
  }

  private async walk(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.walk(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async computeDirectoryChecksum(rootDir: string): Promise<string> {
    const hash = createHash('sha256');
    const files = (await this.walk(rootDir)).sort();

    for (const file of files) {
      const relative = path.relative(rootDir, file);
      hash.update(relative);
      hash.update(await fs.readFile(file));
    }

    return hash.digest('hex');
  }
}
