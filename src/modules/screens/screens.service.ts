import { PrismaService } from '@core/prisma';
import { Injectable } from '@nestjs/common';

import { CreateScreenDTO } from './dto/create-screen.dto';

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
}
