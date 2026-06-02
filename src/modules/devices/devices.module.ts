import { AuthModule } from '@modules/auth';
import { RenderModule } from '@modules/render';
import { Module } from '@nestjs/common';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [AuthModule, RenderModule],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
