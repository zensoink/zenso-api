import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateScreenDTO } from './dto/create-screen.dto';
import { UpdateScreenDTO } from './dto/update-screen.dto';

@Injectable()
export class ScreensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScreenDTO) {
    return this.prisma.screen.create({
      data: {
        name: dto.name,
        userId: dto.userId,
        layoutType: dto.layoutType ?? 'full',
        width: dto.width ?? 800,
        height: dto.height ?? 480,
        deviceId: dto.deviceId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.screen.findMany({
      include: { slots: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.screen.findUnique({
      where: { id },
      include: {
        slots: {
          include: { pluginInstance: true },
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
