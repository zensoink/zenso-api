import { Module } from '@nestjs/common';

import { PluginsController } from './plugins.controller';
import { PluginsService } from './services/plugins.service';

@Module({
  providers: [PluginsService],
  controllers: [PluginsController],
})
export class PluginsModule {}
