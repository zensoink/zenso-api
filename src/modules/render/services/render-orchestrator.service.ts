import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

import { RenderCacheService } from './render-cache.service';
import { ScreenComposerService } from './screen-composer.service';
import { ScreenRenderService } from './screen-render.service';

@Injectable()
export class RenderOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly screenRenderService: ScreenRenderService,
    private readonly screenComposerService: ScreenComposerService,
    private readonly renderCacheService: RenderCacheService
  ) {}

  async render(screenId: number, runtimeData?: Record<string, unknown>): Promise<Buffer> {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        slots: {
          orderBy: { renderOrder: 'asc' },
          include: {
            pluginInstance: {
              include: {
                pluginVersion: true,
              },
            },
          },
        },
      },
    });

    if (!screen) {
      throw new NotFoundException(`Screen ${screenId} not found`);
    }

    const slots = screen.slots.map(s => ({
      pluginInstanceId: s.pluginInstanceId,
      pluginVersion: s.pluginInstance?.pluginVersion?.version ?? null,
      configJson: s.pluginInstance?.configJson,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      zIndex: s.zIndex,
    }));

    const cacheKey = this.renderCacheService.generateKey(screen.id, screen.width, screen.height, slots, runtimeData);

    const cached = this.renderCacheService.get(cacheKey);
    if (cached) return cached;

    if (screen.slots.length === 0) {
      const blank = await this.screenComposerService.compose({
        width: screen.width,
        height: screen.height,
        slots: [],
      });
      this.renderCacheService.set(cacheKey, blank);
      return blank;
    }

    const renderedSlots = await this.screenRenderService.renderSlots(screenId, runtimeData);

    const png = await this.screenComposerService.compose({
      width: screen.width,
      height: screen.height,
      slots: renderedSlots,
    });

    this.renderCacheService.set(cacheKey, png);

    return png;
  }
}
