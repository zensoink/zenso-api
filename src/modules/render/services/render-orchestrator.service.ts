import { createHash } from 'node:crypto';

import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { getDefaultPalettes } from 'epdoptimize';
import { z } from 'zod';

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

  async renderPreview(
    screenId: number,
    runtimeData?: Record<string, unknown>
  ): Promise<{ buffer: Buffer; contentKey: string }> {
    // Preview always re-renders so the panel shows live data; the fresh PNG
    // is still written to the cache for the device path to reuse.
    const { png, cacheKey } = await this.buildScreenPng(screenId, runtimeData, { skipCacheRead: true });
    const { width, height, palette, mode } = await this.getScreenRenderConfig(screenId);
    const buffer = await this.epdImageService.renderPreview({ input: png, width, height, palette, mode });
    return { buffer, contentKey: cacheKey };
  }

  async renderForDevice(
    screenId: number,
    runtimeData?: Record<string, unknown>
  ): Promise<{ buffer: Buffer; contentKey: string }> {
    const { png, cacheKey } = await this.buildScreenPng(screenId, runtimeData);
    const { width, height, palette, mode } = await this.getScreenRenderConfig(screenId);
    const buffer = await this.epdImageService.renderForDevice({ input: png, width, height, palette, mode });
    return { buffer, contentKey: cacheKey };
  }

  private async getScreen(screenId: number) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: { device: true },
    });
    if (!screen) throw new NotFoundException(`Screen ${screenId} not found`);
    return screen;
  }

  private async buildScreenPng(
    screenId: number,
    runtimeData?: Record<string, unknown>,
    opts?: { skipCacheRead?: boolean }
  ): Promise<{ png: Buffer; cacheKey: string }> {
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
    // Cache lifetime follows the screen's refreshRate.
    const ttlMs = Math.max(30, screen.refreshRate ?? 300) * 1000;

    if (!opts?.skipCacheRead) {
      const cached = this.renderCacheService.get(cacheKey);
      if (cached) return { png: cached, cacheKey: hashBuffer(cached) };
    }

    if (screen.slots.length === 0) {
      const blank = await this.screenComposerService.compose({
        width: screen.width,
        height: screen.height,
        slots: [],
      });
      this.renderCacheService.set(cacheKey, blank, ttlMs);
      return { png: blank, cacheKey: hashBuffer(blank) };
    }

    // Data-source cache must not outlive the render cache.
    const renderedSlots = await this.screenRenderService.renderSlots(screenId, runtimeData, Math.min(ttlMs, 600_000));

    const png = await this.screenComposerService.compose({
      width: screen.width,
      height: screen.height,
      slots: renderedSlots,
    });

    this.renderCacheService.set(cacheKey, png, ttlMs);

    return { png, cacheKey: hashBuffer(png) };
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
      mode: z.enum(['photo', 'ui']).safeParse(screen.renderMode).data ?? 'ui',
    };
  }

  private getDefaultPalette(): string[] {
    return getDefaultPalettes('acep');
  }
}

function hashBuffer(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
