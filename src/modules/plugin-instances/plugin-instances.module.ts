import { AuthModule } from '@modules/auth';
import { Module } from '@nestjs/common';

import { PluginInstancesController } from './plugin-instances.controller';
import { PluginInstancesService } from './plugin-instances.service';

@Module({
  imports: [AuthModule],
  controllers: [PluginInstancesController],
  providers: [PluginInstancesService],
  exports: [PluginInstancesService],
})
export class PluginInstancesModule {}
