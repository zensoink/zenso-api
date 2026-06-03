import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PluginStorageService } from '../services/plugin-storage.service';

@ApiTags('plugins-debug')
@Controller('plugins-debug')
export class PluginsDebugController {
  constructor(private readonly pluginStorageService: PluginStorageService) {}

  /* DEBUG */
  @Get('root')
  @ApiOperation({ summary: '[Debug] List local plugin root' })
  getRoot() {
    return {
      rootDir: this.pluginStorageService.getRootDir(),
    };
  }

  @Get(':slug/:version')
  @ApiOperation({ summary: '[Debug] Get plugin manifest' })
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
  @ApiOperation({ summary: '[Debug] Ensure plugin directories exist' })
  async ensure(@Param('slug') slug: string, @Param('version') version: string) {
    await this.pluginStorageService.ensurePluginDirectories(slug, version);

    return {
      ok: true,
      root: this.pluginStorageService.getPluginRoot(slug),
      versionPath: this.pluginStorageService.getVersionPath(slug, version),
    };
  }
}
