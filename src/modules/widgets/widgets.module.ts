import { Module } from '@nestjs/common';

import { RenderEngineService } from './services/render-engine.service';
import { WidgetsController } from './widgets.controller';
import { WidgetsService } from './widgets.service';

@Module({
  providers: [WidgetsService, RenderEngineService],
  controllers: [WidgetsController],
  exports: [WidgetsService, RenderEngineService],
})
export class WidgetsModule {}
