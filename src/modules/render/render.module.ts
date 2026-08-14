import { AuthModule } from '@modules/auth';
import { DataSourcesModule } from '@modules/data-sources';
import { PluginsModule } from '@modules/plugins';
import { Module } from '@nestjs/common';

import { RenderController } from './render.controller';
import { BrowserService } from './services/browser.service';
import { ContextAggregationService } from './services/context-aggregation.service';
import { EpdImageService } from './services/epd-image.service';
import { HtmlToImageService } from './services/html-to-image.service';
import { PluginExecutionService } from './services/plugin-execution.service';
import { RenderCacheService } from './services/render-cache.service';
import { RenderOrchestratorService } from './services/render-orchestrator.service';
import { ScreenComposerService } from './services/screen-composer.service';
import { ScreenRenderService } from './services/screen-render.service';

@Module({
  imports: [AuthModule, PluginsModule, DataSourcesModule],
  controllers: [RenderController],
  providers: [
    BrowserService,
    ContextAggregationService,
    EpdImageService,
    HtmlToImageService,
    PluginExecutionService,
    ScreenRenderService,
    ScreenComposerService,
    RenderOrchestratorService,
    RenderCacheService,
  ],
  exports: [RenderOrchestratorService, RenderCacheService],
})
export class RenderModule {}
