import { PrismaService } from '@core/prisma';
import { isValidTimeZone } from '@modules/data-sources/timezone';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateScreenDTO } from './dto/create-screen.dto';
import { UpdateScreenDTO } from './dto/update-screen.dto';

@Injectable()
export class ScreensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateScreenDTO) {
    if (dto.timeZoneIana !== undefined && !isValidTimeZone(dto.timeZoneIana)) {
      throw new BadRequestException(`Invalid IANA timezone: ${dto.timeZoneIana}`);
    }
    return this.prisma.screen.create({
      data: {
        name: dto.name,
        userId,
        layoutType: dto.layoutType ?? 'full',
        width: dto.width ?? 800,
        height: dto.height ?? 480,
        deviceId: dto.deviceId,
        isActive: dto.isActive ?? true,
        timeZoneIana: dto.timeZoneIana,
      },
    });
  }

  async findAll() {
    return this.prisma.screen.findMany({
      include: {
        slots: {
          include: {
            pluginInstance: {
              include: { plugin: true },
            },
          },
          orderBy: { renderOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.screen.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            pluginInstance: {
              include: { plugin: true },
            },
          },
          orderBy: { renderOrder: 'asc' },
        },
      },
    });
  }

  async update(id: number, dto: UpdateScreenDTO) {
    const existing = await this.prisma.screen.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Screen not found');
    }
    if (dto.timeZoneIana !== undefined && dto.timeZoneIana !== null && !isValidTimeZone(dto.timeZoneIana)) {
      throw new BadRequestException(`Invalid IANA timezone: ${dto.timeZoneIana}`);
    }

    return this.prisma.screen.update({
      where: { id },
      data: { ...dto, contentHash: null },
    });
  }

  async delete(id: number) {
    const existing = await this.prisma.screen.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Screen not found');
    }

    return this.prisma.screen.delete({ where: { id } });
  }
}
