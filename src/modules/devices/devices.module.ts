import { RenderModule } from '@modules/render';
import { Module } from '@nestjs/common';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [RenderModule],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
