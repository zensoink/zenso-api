import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CreatePluginInstanceDTO } from './dto/create-plugin-instance.dto';
import { PluginInstanceResponseDto } from './dto/plugin-instance-response.dto';
import { UpdatePluginInstanceDTO } from './dto/update-plugin-instance.dto';
import { PluginInstancesService } from './plugin-instances.service';

@ApiTags('plugin-instances')
@ApiBearerAuth('user-jwt')
@Controller('plugin-instances')
@UseGuards(UserJwtAuthGuard)
export class PluginInstancesController {
  constructor(private readonly pluginInstancesService: PluginInstancesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create plugin instance',
    description:
      'Creates a new instance of a plugin with optional configuration (configJson). ' +
      'The instance can be assigned to screen slots. If executionMode is not specified, ' +
      'inherits from the plugin version.',
  })
  @ApiBody({ type: CreatePluginInstanceDTO })
  @ApiCreatedResponse({ type: PluginInstanceResponseDto, description: 'Plugin instance created' })
  create(@Body() dto: CreatePluginInstanceDTO, @Req() req: { user: { userId: number } }) {
    return this.pluginInstancesService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List plugin instances',
    description: 'Returns all plugin instances for the authenticated user.',
  })
  @ApiOkResponse({ type: PluginInstanceResponseDto, isArray: true, description: 'List of plugin instances' })
  findAll() {
    return this.pluginInstancesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get plugin instance by ID',
    description: 'Returns a single plugin instance with its plugin and version relations.',
  })
  @ApiOkResponse({ type: PluginInstanceResponseDto, description: 'Plugin instance details' })
  @ApiResponse({ status: 404, description: 'Plugin instance not found' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.pluginInstancesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update plugin instance config',
    description: 'Updates plugin instance properties: name, config, execution mode, or enabled status.',
  })
  @ApiBody({ type: UpdatePluginInstanceDTO })
  @ApiOkResponse({ type: PluginInstanceResponseDto, description: 'Updated plugin instance' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePluginInstanceDTO) {
    return this.pluginInstancesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete plugin instance',
    description:
      'Permanently removes a plugin instance. If the instance is assigned to any screen slots, ' +
      'those slots are also removed.',
  })
  @ApiResponse({ status: 200, description: 'Plugin instance deleted' })
  @ApiResponse({ status: 404, description: 'Plugin instance not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pluginInstancesService.remove(id);
  }
}
