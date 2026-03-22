import { Module } from '@nestjs/common';

import { WidgetsController } from './widgets.controller';
import { WidgetsService } from './widgets.service';

@Module({
  providers: [WidgetsService],
  controllers: [WidgetsController],
  exports: [WidgetsService],
})
export class WidgetsModule {}
