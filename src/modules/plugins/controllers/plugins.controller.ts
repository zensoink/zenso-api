import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { InstallFromRegistryDTO } from '../dto/install-from-registry.dto';
import { PluginsService } from '../services/plugins.service';
import { RegistryClient } from '../services/registry-client.service';

@Controller('plugins')
export class PluginsController {
  constructor(
    private readonly pluginsService: PluginsService,
    private readonly registryClient: RegistryClient
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('registry')
  getRegistryCatalog() {
    return this.registryClient.getCatalog();
  }

  @Get('registry/:pluginId')
  getRegistryPlugin(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPlugin(pluginId);
  }

  @Get('registry/:pluginId/versions')
  getRegistryPluginVersions(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPluginVersions(pluginId);
  }

  @Post('install-from-registry')
  @UseGuards(UserJwtAuthGuard)
  installFromRegistry(@Body() dto: InstallFromRegistryDTO) {
    return this.pluginsService.installFromRegistry(dto);
  }

  @Get('installed')
  @UseGuards(UserJwtAuthGuard)
  getInstalledPlugins() {
    return this.pluginsService.getInstalledPlugins();
  }
}
