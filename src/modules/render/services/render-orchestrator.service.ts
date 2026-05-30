import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { getDefaultPalettes } from 'epdoptimize';

import { EpdImageService } from './epd-image.service';
import { RenderCacheService } from './render-cache.service';
import { ScreenComposerService } from './screen-composer.service';
import { ScreenRenderService } from './screen-render.service';

@Injectable()
export class RenderOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly screenRenderService: ScreenRenderService,
    private readonly screenComposerService: ScreenComposerService,
    private readonly renderCacheService: RenderCacheService,
    private readonly epdImageService: EpdImageService
  ) {}

  async renderPreview(screenId: number, runtimeData?: Record<string, unknown>): Promise<Buffer> {
    const png = await this.buildScreenPng(screenId, runtimeData);
    const { width, height, palette, mode } = await this.getScreenRenderConfig(screenId);
    return this.epdImageService.renderPreview({ input: png, width, height, palette, mode });
  }

  async renderForDevice(screenId: number, runtimeData?: Record<string, unknown>): Promise<Buffer> {
    const png = await this.buildScreenPng(screenId, runtimeData);
    const { width, height, palette, mode } = await this.getScreenRenderConfig(screenId);
    return this.epdImageService.renderForDevice({ input: png, width, height, palette, mode });
  }

  private async getScreen(screenId: number) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: { device: true },
    });
    if (!screen) throw new NotFoundException(`Screen ${screenId} not found`);
    return screen;
  }

  private async buildScreenPng(screenId: number, runtimeData?: Record<string, unknown>): Promise<Buffer> {
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

    const slots = screen.slots.map(({ x, zIndex, y, w, h, pluginInstanceId, pluginInstance }) => ({
      pluginVersion: pluginInstance?.pluginVersion?.version ?? null,
      configJson: pluginInstance?.configJson,
      pluginInstanceId,
      x,
      y,
      w,
      h,
      zIndex,
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

  private async getScreenRenderConfig(screenId: number): Promise<{
    width: number;
    height: number;
    palette: string[];
    mode: 'photo' | 'ui';
  }> {
    const screen = await this.getScreen(screenId);
    return {
      width: screen.width,
      height: screen.height,
      palette: screen.palette.length > 0 ? screen.palette : this.getDefaultPalette(),
      mode: (screen.renderMode as 'photo' | 'ui') || 'ui',
    };
  }

  private getDefaultPalette(): string[] {
    return getDefaultPalettes('acep');
  }
}
