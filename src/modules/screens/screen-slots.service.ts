import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateScreenSlotDTO } from './dto/create-screen-slot.dto';
import { getLayoutSlots, LayoutType } from './layout-helper';

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
      const layoutSlots = getLayoutSlots(screen.layoutType as LayoutType, screen.width, screen.height);
      const layoutSlot = layoutSlots.find(s => s.slotKey === dto.slotKey);
      if (layoutSlot) {
        x ??= layoutSlot.x;
        y ??= layoutSlot.y;
        w ??= layoutSlot.w;
        h ??= layoutSlot.h;
      }
    }

    return this.prisma.screenSlot.create({
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
  }

  async findByScreenId(screenId: number) {
    return this.prisma.screenSlot.findMany({
      where: { screenId },
      include: { pluginInstance: true },
      orderBy: { renderOrder: 'asc' },
    });
  }
}
