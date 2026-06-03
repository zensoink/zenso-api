import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InstallFromRegistryDTO } from '../dto/install-from-registry.dto';
import { PluginsService } from '../services/plugins.service';
import { RegistryClient } from '../services/registry-client.service';

@ApiTags('plugins')
@Controller('plugins')
export class PluginsController {
  constructor(
    private readonly pluginsService: PluginsService,
    private readonly registryClient: RegistryClient
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok' };
  }

  @Get('registry')
  @ApiOperation({ summary: 'Browse plugin registry catalog' })
  getRegistryCatalog() {
    return this.registryClient.getCatalog();
  }

  @Get('registry/:pluginId')
  @ApiOperation({ summary: 'Get registry plugin details' })
  getRegistryPlugin(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPlugin(pluginId);
  }

  @Get('registry/:pluginId/versions')
  @ApiOperation({ summary: 'List registry plugin versions' })
  getRegistryPluginVersions(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPluginVersions(pluginId);
  }

  @Post('install-from-registry')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'Install plugin from registry' })
  @ApiBearerAuth('user-jwt')
  installFromRegistry(@Body() dto: InstallFromRegistryDTO) {
    return this.pluginsService.installFromRegistry(dto);
  }

  @Get('installed')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'List installed plugins' })
  @ApiBearerAuth('user-jwt')
  getInstalledPlugins() {
    return this.pluginsService.getInstalledPlugins();
  }

  @Get('installed/:id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'Get installed plugin by ID' })
  @ApiBearerAuth('user-jwt')
  getInstalledPlugin(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.getInstalledPluginById(id);
  }
}
