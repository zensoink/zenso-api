import { createHash } from 'node:crypto';

import { PrismaService } from '@core/prisma';
import { toPrismaJson } from '@core/prisma/utils';
import { RenderCacheService, SlotRenderInput } from '@modules/render';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceClaimStatus, DeviceStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceCheckInDto } from './dto/device-check-in.dto';
import { DeviceStatusResponseDto } from './dto/device-status-response.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  private readonly DEVICE_SELECT: Prisma.DeviceSelect = {
    id: true,
    hardwareId: true,
    name: true,
    status: true,
    width: true,
    height: true,
    palette: true,
    displayProfile: true,
    epdConfig: true,
    refreshRate: true,
    rotation: true,
    palettePreset: true,
    deviceTokenVersion: true,
    lastSeenAt: true,
    firmwareVersion: true,
    revokedAt: true,
    userId: true,
    claimStatus: true,
    claimedAt: true,
    lastBootstrapAt: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderCacheService: RenderCacheService
  ) {}

  async createDevice(userId: number, dto: CreateDeviceDto) {
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const deviceSecretHash = await bcrypt.hash(rawSecret, 10);

    const device = await this.prisma.device.create({
      data: {
        hardwareId: dto.hardware_id,
        name: dto.name,
        width: dto.width ?? 800,
        height: dto.height ?? 480,
        palette: dto.palette ?? ['#000000', '#FFFFFF', '#00FF00', '#0000FF', '#FF0000', '#FFFF00'],
        displayProfile: dto.displayProfile ?? 'spectra6_7in3',
        epdConfig: dto.epdConfig !== undefined ? toPrismaJson(dto.epdConfig) : undefined,
        refreshRate: dto.refreshRate ?? 300,
        rotation: dto.rotation ?? 0,
        palettePreset: dto.palettePreset ?? 'full',
        deviceSecretHash,
        deviceTokenVersion: 1,
        userId,
        claimStatus: DeviceClaimStatus.claimed,
      },
    });

    return {
      device: {
        id: device.id,
        hardwareId: device.hardwareId,
        name: device.name,
        status: device.status,
        width: device.width,
        height: device.height,
        palette: device.palette,
        displayProfile: device.displayProfile,
        epdConfig: device.epdConfig,
        refreshRate: device.refreshRate,
        rotation: device.rotation,
        palettePreset: device.palettePreset,
        deviceTokenVersion: device.deviceTokenVersion,
        userId: device.userId,
        claimStatus: device.claimStatus,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      },
      rawSecret,
    };
  }

  async findAll(userId: number) {
    return this.prisma.device.findMany({
      where: { userId },
      select: this.DEVICE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number, userId: number) {
    const device = await this.prisma.device.findFirst({
      where: { id, userId },
      select: this.DEVICE_SELECT,
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  async update(id: number, userId: number, dto: UpdateDeviceDto) {
    const existing = await this.prisma.device.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Device not found');
    }

    const updateData: Prisma.DeviceUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.width !== undefined) updateData.width = dto.width;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.palette !== undefined) updateData.palette = dto.palette;
    if (dto.displayProfile !== undefined) updateData.displayProfile = dto.displayProfile;
    if (dto.epdConfig !== undefined) updateData.epdConfig = toPrismaJson(dto.epdConfig);
    if (dto.refreshRate !== undefined) updateData.refreshRate = dto.refreshRate;
    if (dto.rotation !== undefined) updateData.rotation = dto.rotation;
    if (dto.palettePreset !== undefined) updateData.palettePreset = dto.palettePreset;
    if (dto.status !== undefined) updateData.status = dto.status;

    const affectsDisplay =
      dto.width !== undefined ||
      dto.height !== undefined ||
      dto.palette !== undefined ||
      dto.displayProfile !== undefined ||
      dto.rotation !== undefined ||
      dto.palettePreset !== undefined ||
      dto.epdConfig !== undefined;

    if (affectsDisplay) {
      const screens = await this.prisma.screen.findMany({
        where: { deviceId: id },
        select: { id: true },
      });
      for (const screen of screens) {
        this.renderCacheService.invalidateScreen(screen.id);
      }
      if (screens.length > 0) {
        await this.prisma.screen.updateMany({
          where: { deviceId: id },
          data: { contentHash: null },
        });
      }
    }

    return this.prisma.device.update({
      where: { id },
      data: updateData,
      select: this.DEVICE_SELECT,
    });
  }

  async revoke(id: number, userId: number, hard = false) {
    const device = await this.prisma.device.findFirst({ where: { id, userId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const screens = await this.prisma.screen.findMany({
      where: { deviceId: id },
      select: { id: true },
    });
    for (const screen of screens) {
      this.renderCacheService.invalidateScreen(screen.id);
    }
    if (screens.length > 0) {
      await this.prisma.screen.updateMany({
        where: { deviceId: id },
        data: { deviceId: null, contentHash: null },
      });
    }

    if (hard) {
      await this.prisma.claimSession.deleteMany({
        where: { deviceId: id },
      });
      await this.prisma.device.delete({
        where: { id },
      });
      return { deviceId: id, revokedAt: new Date(), hardDeleted: true };
    }

    const revokedAt = new Date();
    await this.prisma.device.update({
      where: { id },
      data: {
        revokedAt,
        status: DeviceStatus.inactive,
        claimStatus: DeviceClaimStatus.pending,
        claimedAt: null,
        deviceTokenVersion: { increment: 1 },
      },
    });

    return { deviceId: id, revokedAt, hardDeleted: false };
  }

  async forceRefresh(id: number, userId: number) {
    const device = await this.prisma.device.findFirst({ where: { id, userId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const screens = await this.prisma.screen.findMany({
      where: { deviceId: id },
      select: { id: true },
    });

    for (const screen of screens) {
      this.renderCacheService.invalidateScreen(screen.id);
    }

    if (screens.length > 0) {
      await this.prisma.screen.updateMany({
        where: { deviceId: id },
        data: { contentHash: null },
      });
    }

    return {
      deviceId: id,
      invalidatedScreensCount: screens.length,
      refreshedAt: new Date(),
    };
  }

  async checkIn(deviceId: number, dto: DeviceCheckInDto): Promise<DeviceStatusResponseDto> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
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
      status: DeviceStatus.active,
    };

    if (dto.firmwareVersion !== undefined) {
      updateData.firmwareVersion = dto.firmwareVersion;
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: updateData,
    });

    const screen = device.screens[0] ?? null;

    let contentChanged = false;
    if (screen) {
      const slots: SlotRenderInput[] = screen.slots.map(slot => ({
        pluginInstanceId: slot.pluginInstanceId,
        pluginVersion: slot.pluginInstance?.pluginVersion?.version ?? null,
        configJson: slot.pluginInstance?.configJson,
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        zIndex: slot.zIndex,
      }));
      const isSwapped = device.rotation === 90 || device.rotation === 270;
      const canvasWidth = isSwapped ? device.height : device.width;
      const canvasHeight = isSwapped ? device.width : device.height;

      const cacheKey = this.renderCacheService.generateKey(screen.id, canvasWidth, canvasHeight, slots, {
        rotation: device.rotation,
        displayProfile: device.displayProfile,
        palette: device.palette,
      });
      // Changed when the config key is unknown or the cached PNG differs from the last image served.
      // ETag/304 on GET /devices/display decides byte-equality.
      const cached = this.renderCacheService.get(cacheKey);
      contentChanged = cached === null || screen.contentHash !== createHash('sha256').update(cached).digest('hex');
    }

    return {
      hardwareId: device.hardwareId,
      screenId: screen?.id ?? null,
      imageUrl: screen ? `/devices/display` : null,
      refreshRate: device.refreshRate,
      width: device.width,
      height: device.height,
      palette: device.palette,
      displayProfile: device.displayProfile,
      rotation: device.rotation,
      renderMode: screen?.renderMode ?? 'ui',
      hasImage: screen != null && screen.slots.length > 0,
      contentChanged,
    };
  }

  async rotateSecret(id: number, userId: number) {
    const device = await this.prisma.device.findFirst({ where: { id, userId } });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const rawSecret = crypto.randomBytes(32).toString('hex');
    const deviceSecretHash = await bcrypt.hash(rawSecret, 10);

    await this.prisma.device.update({
      where: { id },
      data: {
        deviceSecretHash,
        deviceTokenVersion: { increment: 1 },
      },
    });

    return { id, rawSecret };
  }
}
