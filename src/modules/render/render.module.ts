import { PluginsModule } from '@modules/plugins';
import { WidgetsModule } from '@modules/widgets';
import { Module } from '@nestjs/common';

import { RenderController } from './render.controller';
import { ContextAggregationService } from './services/context-aggregation.service';
import { HtmlToImageService } from './services/html-to-image.service';
import { PluginExecutionService } from './services/plugin-execution.service';
import { RenderCacheService } from './services/render-cache.service';
import { RenderOrchestratorService } from './services/render-orchestrator.service';
import { ScreenComposerService } from './services/screen-composer.service';
import { ScreenRenderService } from './services/screen-render.service';

@Module({
  imports: [PluginsModule, WidgetsModule],
  controllers: [RenderController],
  providers: [
    ContextAggregationService,
    PluginExecutionService,
    HtmlToImageService,
    ScreenRenderService,
    ScreenComposerService,
    RenderOrchestratorService,
    RenderCacheService,
  ],
})
export class RenderModule {}
