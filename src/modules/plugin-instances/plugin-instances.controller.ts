import { Body, Controller, Get, Post } from '@nestjs/common';

import { CreatePluginInstanceDTO } from './dto/create-plugin-instance.dto';
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
}
