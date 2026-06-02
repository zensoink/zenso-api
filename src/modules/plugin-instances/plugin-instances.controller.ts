import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { CreatePluginInstanceDTO } from './dto/create-plugin-instance.dto';
import { UpdatePluginInstanceDTO } from './dto/update-plugin-instance.dto';
import { PluginInstancesService } from './plugin-instances.service';

@Controller('plugin-instances')
export class PluginInstancesController {
  constructor(private readonly pluginInstancesService: PluginInstancesService) {}

  @Post()
  create(@Body() dto: CreatePluginInstanceDTO) {
    return this.pluginInstancesService.create(dto);
  }

  @Get()
  findAll() {
    return this.pluginInstancesService.findAll();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePluginInstanceDTO) {
    return this.pluginInstancesService.update(id, dto);
  }
}
