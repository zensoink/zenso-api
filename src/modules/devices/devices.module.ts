import { RenderModule } from '@modules/render';
import { Module } from '@nestjs/common';

import { DevicesController } from './devices.controller';

@Module({
  imports: [RenderModule],
  controllers: [DevicesController],
})
export class DevicesModule {}
