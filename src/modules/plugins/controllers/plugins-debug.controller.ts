import { Controller, Get, Param } from '@nestjs/common';

import { PluginStorageService } from '../services/plugin-storage.service';

@Controller('plugins-debug')
export class PluginsDebugController {
  constructor(private readonly pluginStorageService: PluginStorageService) {}

  /* DEBUG */
  @Get('root')
  getRoot() {
    return {
      rootDir: this.pluginStorageService.getRootDir(),
    };
  }

  @Get(':slug/:version')
  async getManifest(@Param('slug') slug: string, @Param('version') version: string) {
    const manifest = await this.pluginStorageService.readManifest(slug, version);

    return {
      slug,
      version,
      manifest,
      pluginRoot: this.pluginStorageService.getPluginRoot(slug),
      versionPath: this.pluginStorageService.getVersionPath(slug, version),
    };
  }

  @Get('ensure/:slug/:version')
  async ensure(@Param('slug') slug: string, @Param('version') version: string) {
    await this.pluginStorageService.ensurePluginDirectories(slug, version);

    return {
      ok: true,
      root: this.pluginStorageService.getPluginRoot(slug),
      versionPath: this.pluginStorageService.getVersionPath(slug, version),
    };
  }
}
