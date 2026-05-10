import { Module } from '@nestjs/common';

import { PluginsController } from './plugins.controller';
import { PluginsDebugController } from './plugins-debug.controller';
import { PluginStorageService } from './services/plugin-storage.service';
import { PluginsService } from './services/plugins.service';

@Module({
  providers: [PluginsService, PluginStorageService],
  controllers: [PluginsController, PluginsDebugController],
  exports: [PluginStorageService],
})
export class PluginsModule {}
