import { createHash } from 'node:crypto';

import { PrismaService } from '@core/prisma';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { EpdImageService } from './epd-image.service';
import { RenderCacheService } from './render-cache.service';
import { ScreenComposerService } from './screen-composer.service';
import { ScreenRenderService } from './screen-render.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hashBuffer(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

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
    const { png, cacheKey, device, screen } = await this.buildScreenPng(screenId, runtimeData, {
      skipCacheRead: true,
    });
    const deviceWidth = device.width ?? 800;
    const deviceHeight = device.height ?? 480;
    const deviceRotation = device.rotation ?? 0;
    const devicePalette =
      Array.isArray(device.palette) && device.palette.length > 0 ? device.palette : this.getDefaultPalette();
    const deviceDisplayProfile = device.displayProfile ?? 'spectra6_7in3';

    const mode = z.enum(['photo', 'ui']).safeParse(screen.renderMode).data ?? 'ui';
    const epdConfig = isRecord(device.epdConfig) ? device.epdConfig : null;

    const buffer = await this.epdImageService.renderPreview({
      input: png,
      width: deviceWidth,
      height: deviceHeight,
      palette: devicePalette,
      mode,
      rotation: deviceRotation,
      displayProfile: deviceDisplayProfile,
      epdConfig,
    });
    return { buffer, contentKey: cacheKey };
  }

  async renderForDevice(
    screenId: number,
    runtimeData?: Record<string, unknown>
  ): Promise<{ buffer: Buffer; contentKey: string }> {
    const { png, cacheKey, device, screen } = await this.buildScreenPng(screenId, runtimeData);
    const deviceWidth = device.width ?? 800;
    const deviceHeight = device.height ?? 480;
    const deviceRotation = device.rotation ?? 0;
    const devicePalette =
      Array.isArray(device.palette) && device.palette.length > 0 ? device.palette : this.getDefaultPalette();
    const deviceDisplayProfile = device.displayProfile ?? 'spectra6_7in3';

    const mode = z.enum(['photo', 'ui']).safeParse(screen.renderMode).data ?? 'ui';
    const epdConfig = isRecord(device.epdConfig) ? device.epdConfig : null;

    const buffer = await this.epdImageService.renderForDevice({
      input: png,
      width: deviceWidth,
      height: deviceHeight,
      palette: devicePalette,
      mode,
      rotation: deviceRotation,
      displayProfile: deviceDisplayProfile,
      epdConfig,
    });
    return { buffer, contentKey: cacheKey };
  }

  private async buildScreenPng(
    screenId: number,
    runtimeData?: Record<string, unknown>,
    opts?: { skipCacheRead?: boolean }
  ) {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        device: true,
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

    if (!screen.device || screen.deviceId === null) {
      throw new BadRequestException('Screen cannot be rendered without an assigned device.');
    }

    const device = screen.device;
    const deviceWidth = device.width ?? 800;
    const deviceHeight = device.height ?? 480;
    const deviceRotation = device.rotation ?? 0;
    const isSwapped = deviceRotation === 90 || deviceRotation === 270;
    const canvasWidth = isSwapped ? deviceHeight : deviceWidth;
    const canvasHeight = isSwapped ? deviceWidth : deviceHeight;

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

    const cacheKey = this.renderCacheService.generateKey(screen.id, canvasWidth, canvasHeight, slots, {
      runtimeData,
      rotation: device.rotation,
      displayProfile: device.displayProfile,
      palette: device.palette,
    });

    // Cache lifetime follows the authoritative device refreshRate
    const ttlMs = Math.max(30, device.refreshRate ?? 300) * 1000;

    if (!opts?.skipCacheRead) {
      const cached = this.renderCacheService.get(cacheKey);
      if (cached) return { png: cached, cacheKey: hashBuffer(cached), device, screen };
    }

    if (screen.slots.length === 0) {
      const blank = await this.screenComposerService.compose({
        width: canvasWidth,
        height: canvasHeight,
        slots: [],
      });
      this.renderCacheService.set(cacheKey, blank, ttlMs, screen.id);
      return { png: blank, cacheKey: hashBuffer(blank), device, screen };
    }

    // Data-source cache must not outlive the render cache.
    const renderedSlots = await this.screenRenderService.renderSlots(screenId, runtimeData, Math.min(ttlMs, 600_000));

    const png = await this.screenComposerService.compose({
      width: canvasWidth,
      height: canvasHeight,
      slots: renderedSlots,
    });

    this.renderCacheService.set(cacheKey, png, ttlMs, screen.id);

    return { png, cacheKey: hashBuffer(png), device, screen };
  }

  private getDefaultPalette(): string[] {
    return ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00'];
  }
}
