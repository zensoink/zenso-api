import { Module } from '@nestjs/common';

import { WidgetsModule } from '../widgets';
import { DevicesController } from './devices.controller';

@Module({
  imports: [WidgetsModule],
  controllers: [DevicesController],
})
export class DevicesModule {}
