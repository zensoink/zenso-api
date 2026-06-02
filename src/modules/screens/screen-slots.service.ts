import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { CreateScreenSlotDTO } from './dto/create-screen-slot.dto';
import { getLayoutSlots } from './layout-helper';

const LAYOUT_TYPE_SCHEMA = z.enum(['full', 'split-50-50', 'top-bottom', '2x2']);

@Injectable()
export class ScreenSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(screenId: number, dto: CreateScreenSlotDTO) {
    const screen = await this.prisma.screen.findUnique({ where: { id: screenId } });
    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    const pluginInstance = await this.prisma.pluginInstance.findUnique({
      where: { id: dto.pluginInstanceId },
    });
    if (!pluginInstance) {
      throw new NotFoundException('PluginInstance not found');
    }

    let x = dto.x;
    let y = dto.y;
    let w = dto.w;
    let h = dto.h;

    if (x === undefined || y === undefined || w === undefined || h === undefined) {
      const parsedLayoutType = LAYOUT_TYPE_SCHEMA.safeParse(screen.layoutType);
      const layoutSlots = getLayoutSlots(
        parsedLayoutType.success ? parsedLayoutType.data : 'full',
        screen.width,
        screen.height
      );
      const layoutSlot = layoutSlots.find(s => s.slotKey === dto.slotKey);
      if (layoutSlot) {
        x ??= layoutSlot.x;
        y ??= layoutSlot.y;
        w ??= layoutSlot.w;
        h ??= layoutSlot.h;
      }
    }

    const slot = await this.prisma.screenSlot.create({
      data: {
        screenId,
        pluginInstanceId: dto.pluginInstanceId,
        slotKey: dto.slotKey,
        x: x ?? 0,
        y: y ?? 0,
        w: w ?? 0,
        h: h ?? 0,
        zIndex: dto.zIndex ?? 0,
        renderOrder: dto.renderOrder ?? 0,
      },
    });

    // Invalidate contentHash so next check-in reports contentChanged: true
    await this.prisma.screen.update({
      where: { id: screenId },
      data: { contentHash: null },
    });

    return slot;
  }

  async delete(screenId: number, slotId: number) {
    const slot = await this.prisma.screenSlot.findUnique({
      where: { id: slotId },
    });
    if (!slot || slot.screenId !== screenId) {
      throw new NotFoundException('ScreenSlot not found');
    }

    await this.prisma.$transaction([
      this.prisma.screenSlot.delete({ where: { id: slotId } }),
      this.prisma.screen.update({
        where: { id: screenId },
        data: { contentHash: null },
      }),
    ]);
  }
}
