import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
  @ApiResponse({ status: 200, description: 'Plugin registry catalog' })
  getRegistryCatalog() {
    return this.registryClient.getCatalog();
  }

  @Get('registry/:pluginId')
  @ApiOperation({ summary: 'Get registry plugin details' })
  @ApiResponse({ status: 200, description: 'Plugin details' })
  @ApiResponse({ status: 404 })
  getRegistryPlugin(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPlugin(pluginId);
  }

  @Get('registry/:pluginId/versions')
  @ApiOperation({ summary: 'List registry plugin versions' })
  @ApiResponse({ status: 200, description: 'Available versions list' })
  getRegistryPluginVersions(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPluginVersions(pluginId);
  }

  @Post('install-from-registry')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'Install plugin from registry' })
  @ApiBearerAuth('user-jwt')
  @ApiResponse({ status: 201, description: 'Plugin installed' })
  installFromRegistry(@Body() dto: InstallFromRegistryDTO) {
    return this.pluginsService.installFromRegistry(dto);
  }

  @Get('installed')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'List installed plugins' })
  @ApiBearerAuth('user-jwt')
  @ApiResponse({ status: 200, description: 'List of installed plugins' })
  getInstalledPlugins() {
    return this.pluginsService.getInstalledPlugins();
  }

  @Get('installed/:id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'Get installed plugin by ID' })
  @ApiBearerAuth('user-jwt')
  @ApiResponse({ status: 404, description: 'Plugin not found' })
  getInstalledPlugin(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.getInstalledPluginById(id);
  }
}
