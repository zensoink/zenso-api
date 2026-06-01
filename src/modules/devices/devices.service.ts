import { PrismaService } from '@core/prisma';
import { RenderCacheService } from '@modules/render/services/render-cache.service';
import { Injectable, NotFoundException } from '@nestjs/common';

import { DeviceCheckInDto } from './dto/device-check-in.dto';
import { DeviceStatusResponseDto } from './dto/device-status-response.dto';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renderCacheService: RenderCacheService
  ) {}

  async checkIn(uid: string, dto: DeviceCheckInDto): Promise<DeviceStatusResponseDto> {
    const device = await this.prisma.device.findUnique({
      where: { uid },
      include: {
        screens: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
          take: 1,
          include: {
            slots: {
              include: {
                pluginInstance: {
                  include: {
                    pluginVersion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updateData: Record<string, unknown> = {
      lastSeenAt: new Date(),
    };

    if (dto.firmwareVersion !== undefined) {
      updateData.firmwareVersion = dto.firmwareVersion;
    }

    await this.prisma.device.update({
      where: { uid },
      data: updateData,
    });

    const screen = device.screens[0] ?? null;

    let contentChanged = false;
    if (screen) {
      const slots = screen.slots.map(slot => ({
        pluginInstanceId: slot.pluginInstanceId,
        pluginVersion: slot.pluginInstance?.pluginVersion?.version ?? null,
        configJson: slot.pluginInstance?.configJson,
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        zIndex: slot.zIndex,
      }));
      const contentKey = this.renderCacheService.generateKey(screen.id, screen.width, screen.height, slots);
      contentChanged = screen.contentHash !== contentKey;
    }

    return {
      uid: device.uid,
      screenId: screen?.id ?? null,
      imageUrl: screen ? `/devices/${uid}/display` : null,
      refreshRate: screen?.refreshRate ?? 300,
      width: device.width,
      height: device.height,
      palette: screen?.palette ?? device.palette,
      renderMode: screen?.renderMode ?? 'ui',
      hasImage: screen != null && screen.slots.length > 0,
      contentChanged,
    };
  }
}
