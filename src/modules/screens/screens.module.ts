import { AuthModule } from '@modules/auth';
import { Module } from '@nestjs/common';

import { ScreenSlotsService } from './screen-slots.service';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';

@Module({
  imports: [AuthModule],
  controllers: [ScreensController],
  providers: [ScreensService, ScreenSlotsService],
  exports: [ScreensService, ScreenSlotsService],
})
export class ScreensModule {}
