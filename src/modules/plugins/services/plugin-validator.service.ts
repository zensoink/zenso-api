import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { StrictPluginManifest, strictPluginManifestSchema } from '../interfaces/plugin-manifest.strict';
import { IsolateService } from './isolate.service';

const MAX_JAVASCRIPT_BYTES = 2 * 1024 * 1024;

@Injectable()
export class PluginValidatorService {
  private readonly logger = new Logger(PluginValidatorService.name);

  constructor(private readonly isolateService: IsolateService) {}

  async validateExtractedPlugin(rootDir: string): Promise<{
    manifest: StrictPluginManifest;
    checksumSha256: string;
  }> {
    const manifestPath = path.join(rootDir, 'manifest.json');
    const indexPath = path.join(rootDir, 'index.liquid');

    await this.assertExists(manifestPath, 'manifest.json is missing');
    await this.assertExists(indexPath, 'index.liquid is missing');

    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = strictPluginManifestSchema.parse(this.normalizeConfigSchema(JSON.parse(manifestRaw)));

    await this.assertNoForbiddenFiles(rootDir, manifest.capabilities?.includes('script') === true);

    // Warn-first behavioural screen of bundled JS (never rejects: third-party bundles
    // legitimately touch DOM APIs beyond the stub; Chromium remains the runtime sandbox).
    await this.screenBundledJavaScript(rootDir);

    const checksumSha256 = await this.computeDirectoryChecksum(rootDir);

    return { manifest, checksumSha256 };
  }

  toFilesystemSlug(manifestId: string): string {
    return manifestId.replaceAll('/', '__');
  }

  private normalizeConfigSchema(raw: Record<string, unknown>): Record<string, unknown> {
    const configSchema = raw['config_schema'];
    const isEmpty =
      configSchema === undefined ||
      configSchema === null ||
      (typeof configSchema === 'object' && !Array.isArray(configSchema) && Object.keys(configSchema).length === 0);

    if (isEmpty) {
      return { ...raw, config_schema: { type: 'object', properties: {} } };
    }

    return raw;
  }

  private async assertExists(filePath: string, message: string) {
    try {
      await fs.access(filePath);
    } catch {
      throw new BadRequestException(message);
    }
  }

  private async assertNoForbiddenFiles(rootDir: string, allowJavaScript: boolean) {
    const forbiddenExtensions = ['.mjs', '.cjs', '.ts', '.tsx', '.sh', '.exe'];
    const files = await this.walk(rootDir);
    let javaScriptTotalBytes = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (forbiddenExtensions.includes(ext)) {
        throw new BadRequestException(`Forbidden file detected: ${file}`);
      }
      if (ext === '.js') {
        if (!allowJavaScript) {
          throw new BadRequestException(`Forbidden file detected: ${file}`);
        }
        javaScriptTotalBytes += (await fs.stat(file)).size;
      }
    }

    if (javaScriptTotalBytes > MAX_JAVASCRIPT_BYTES) {
      throw new BadRequestException('Total JavaScript size exceeds 2 MB limit');
    }
  }

  private async screenBundledJavaScript(rootDir: string): Promise<void> {
    const files = await this.walk(rootDir);
    const bundles = files.filter(file => path.extname(file).toLowerCase() === '.js');

    for (const file of bundles) {
      const relative = path.relative(rootDir, file);
      const source = await fs.readFile(file, 'utf-8');
      const result = this.isolateService.screenBundle(source);

      if (!result.compiled) {
        this.logger.warn(`Bundle screen: ${relative} failed to run in isolate (${result.error ?? 'unknown'})`);
      } else if (!result.readyFlag) {
        this.logger.warn(`Bundle screen: ${relative} did not set __ZENSO_READY__ in isolate smoke run`);
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
