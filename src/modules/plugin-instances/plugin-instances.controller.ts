import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreatePluginInstanceDTO } from './dto/create-plugin-instance.dto';
import { UpdatePluginInstanceDTO } from './dto/update-plugin-instance.dto';
import { PluginInstancesService } from './plugin-instances.service';

@ApiTags('plugin-instances')
@ApiBearerAuth('user-jwt')
@Controller('plugin-instances')
@UseGuards(UserJwtAuthGuard)
export class PluginInstancesController {
  constructor(private readonly pluginInstancesService: PluginInstancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create plugin instance' })
  create(@Body() dto: CreatePluginInstanceDTO) {
    return this.pluginInstancesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List plugin instances' })
  findAll() {
    return this.pluginInstancesService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update plugin instance config' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePluginInstanceDTO) {
    return this.pluginInstancesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete plugin instance' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pluginInstancesService.remove(id);
  }
}
