import { createHash } from 'node:crypto';

import { PrismaService } from '@core/prisma';
import { RenderCacheService, SlotRenderInput } from '@modules/render';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceClaimStatus, DeviceStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceCheckInDto } from './dto/device-check-in.dto';
import { DeviceStatusResponseDto } from './dto/device-status-response.dto';

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
        palette: dto.palette,
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

  async revoke(id: number, userId: number) {
    const device = await this.prisma.device.findFirst({ where: { id, userId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const revokedAt = new Date();
    await this.prisma.device.update({
      where: { id },
      data: { revokedAt },
    });

    return { deviceId: id, revokedAt };
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
      const cacheKey = this.renderCacheService.generateKey(screen.id, screen.width, screen.height, slots);
      // Changed when the config key is unknown or the cached PNG differs from the last image served.
      // ETag/304 on GET /devices/display decides byte-equality.
      const cached = this.renderCacheService.get(cacheKey);
      contentChanged = cached === null || screen.contentHash !== createHash('sha256').update(cached).digest('hex');
    }

    return {
      hardwareId: device.hardwareId,
      screenId: screen?.id ?? null,
      imageUrl: screen ? `/devices/display` : null,
      refreshRate: screen?.refreshRate ?? 300,
      width: device.width,
      height: device.height,
      palette: screen?.palette ?? device.palette,
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
