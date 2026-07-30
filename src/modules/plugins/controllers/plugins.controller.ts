import { UserJwtAuthGuard } from '@modules/auth';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { InstallFromRegistryDTO } from '../dto/install-from-registry.dto';
import { InstalledPluginResponseDto } from '../dto/installed-plugin-response.dto';
import { RegistryPluginDetailDto, RegistryPluginMetaDto, RegistryPluginVersionDto } from '../dto/registry-response.dto';
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
  @ApiOperation({
    summary: 'Health check',
    description: 'Lightweight health probe. Returns { status: "ok" } when the service is alive.',
  })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
  })
  health() {
    return { status: 'ok' };
  }

  @Get('registry')
  @ApiOperation({
    summary: 'Browse plugin registry catalog',
    description:
      'Returns the full catalog of plugins available in the configured plugin registry. ' +
      'No authentication required — useful for discovering available plugins.',
  })
  @ApiOkResponse({ type: RegistryPluginMetaDto, isArray: true, description: 'Plugin registry catalog' })
  getRegistryCatalog() {
    return this.registryClient.getCatalog();
  }

  @Get('registry/:pluginId')
  @ApiOperation({
    summary: 'Get registry plugin details',
    description:
      'Returns metadata for a specific plugin from the registry, including description, author, and available versions.',
  })
  @ApiOkResponse({ type: RegistryPluginDetailDto, description: 'Plugin details' })
  @ApiResponse({ status: 404, description: 'Plugin not found' })
  getRegistryPlugin(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPlugin(pluginId);
  }

  @Get('registry/:pluginId/versions')
  @ApiOperation({
    summary: 'List registry plugin versions',
    description:
      'Returns all available versions for a specific registry plugin, with their execution modes and statuses.',
  })
  @ApiOkResponse({ type: RegistryPluginVersionDto, isArray: true, description: 'Available versions list' })
  getRegistryPluginVersions(@Param('pluginId') pluginId: string) {
    return this.registryClient.getPluginVersions(pluginId);
  }

  @Post('install-from-registry')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'Install plugin from registry',
    description:
      'Downloads and installs a plugin from the registry. If no version is specified, the latest ' +
      'compatible version is installed. The plugin manifest is validated and stored locally.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiBody({ type: InstallFromRegistryDTO })
  @ApiCreatedResponse({ description: 'Plugin installed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  installFromRegistry(@Body() dto: InstallFromRegistryDTO) {
    return this.pluginsService.installFromRegistry(dto);
  }

  @Get('installed')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'List installed plugins',
    description: 'Returns all plugins installed by the authenticated user, with their versions and status.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: InstalledPluginResponseDto, isArray: true, description: 'List of installed plugins' })
  getInstalledPlugins() {
    return this.pluginsService.getInstalledPlugins();
  }

  @Get('installed/:id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'Get installed plugin by ID',
    description: 'Returns details of a specific installed plugin.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: InstalledPluginResponseDto, description: 'Installed plugin details' })
  @ApiResponse({ status: 404, description: 'Plugin not found' })
  getInstalledPlugin(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.getInstalledPluginById(id);
  }

  @Delete('installed/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'Uninstall plugin by ID',
    description:
      'Removes a plugin and its local storage. Blocks uninstallation if any active plugin instances ' +
      'reference the plugin (returns 409).',
  })
  @ApiBearerAuth('user-jwt')
  @ApiResponse({ status: 200, description: 'Plugin uninstalled' })
  @ApiResponse({ status: 404, description: 'Plugin not found' })
  @ApiResponse({ status: 409, description: 'Plugin is in use by active plugin instances' })
  uninstall(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.uninstall(id);
  }
}
