import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

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

  async renderSlots(screenId: number, runtimeData?: Record<string, unknown>): Promise<RenderedSlot[]> {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        slots: {
          orderBy: { renderOrder: 'asc' },
        },
      },
    });

    if (!screen) {
      throw new NotFoundException(`Screen ${screenId} not found`);
    }

    if (screen.slots.length === 0) {
      return [];
    }

    return Promise.all(
      screen.slots.map(async slot => {
        const { html } = await this.pluginExecutionService.execute({
          pluginInstanceId: slot.pluginInstanceId,
          runtimeData,
          width: slot.w,
          height: slot.h,
        });

        const pngBuffer = await this.htmlToImageService.render({
          html,
          width: slot.w,
          height: slot.h,
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
}
