import { PrismaService } from '@core/prisma';
import { resolveTimeZone } from '@modules/data-sources/timezone';
import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { HtmlToImageService } from './html-to-image.service';
import { PluginExecutionService } from './plugin-execution.service';

export interface RenderedSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  pngBuffer: Buffer;
}

@Injectable()
export class ScreenRenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginExecutionService: PluginExecutionService,
    private readonly htmlToImageService: HtmlToImageService
  ) {}

  async renderSlots(
    screenId: number,
    runtimeData?: Record<string, unknown>,
    dataCacheTtlMs?: number
  ): Promise<RenderedSlot[]> {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        user: true,
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

    if (screen.slots.length === 0) {
      return [];
    }

    const timeZone = resolveTimeZone(screen.timeZoneIana, screen.user?.timeZoneIana);

    return Promise.all(
      screen.slots.map(async slot => {
        const { html } = await this.pluginExecutionService.execute({
          screenId,
          pluginInstanceId: slot.pluginInstanceId,
          runtimeData,
          width: slot.w,
          height: slot.h,
          dataCacheTtlMs,
        });

        const pngBuffer = await this.htmlToImageService.render({
          html,
          width: slot.w,
          height: slot.h,
          assetDir: slot.pluginInstance.pluginVersion?.installPath ?? undefined,
          waitForReady: this.isScriptCapable(slot.pluginInstance.pluginVersion?.manifestJson),
          timeZone,
        });

        return {
          x: slot.x,
          y: slot.y,
          w: slot.w,
          h: slot.h,
          zIndex: slot.zIndex,
          pngBuffer,
        };
      })
    );
  }

  private isScriptCapable(manifestJson: unknown): boolean {
    const manifest = z.record(z.string(), z.unknown()).safeParse(manifestJson);
    const capabilities = z
      .array(z.enum(['script']))
      .optional()
      .safeParse(manifest.success ? manifest.data['capabilities'] : undefined);
    return capabilities.success && capabilities.data?.includes('script') === true;
  }
}
