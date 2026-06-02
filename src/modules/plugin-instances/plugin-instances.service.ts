import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreatePluginInstanceDTO } from './dto/create-plugin-instance.dto';
import { UpdatePluginInstanceDTO } from './dto/update-plugin-instance.dto';

@Injectable()
export class PluginInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePluginInstanceDTO) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id: dto.pluginId } });
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return this.prisma.pluginInstance.create({
      data: {
        pluginId: dto.pluginId,
        pluginVersionId: dto.pluginVersionId,
        name: dto.name,
        configJson: (dto.configJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        executionMode: dto.executionMode ?? 'local',
        isEnabled: dto.isEnabled ?? true,
        userId: dto.userId,
      },
    });
  }

  async findAll() {
    return this.prisma.pluginInstance.findMany({
      include: { plugin: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    const instance = await this.prisma.pluginInstance.findUnique({
      where: { id },
      include: { plugin: true },
    });
    if (!instance) {
      throw new NotFoundException('PluginInstance not found');
    }
    return instance;
  }

  async update(id: number, dto: UpdatePluginInstanceDTO) {
    const existing = await this.prisma.pluginInstance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('PluginInstance not found');
    }

    const screenSlots = await this.prisma.screenSlot.findMany({
      where: { pluginInstanceId: id },
      select: { screenId: true },
    });

    const screenIds = [...new Set(screenSlots.map(s => s.screenId))];

    await this.prisma.$transaction([
      this.prisma.pluginInstance.update({
        where: { id },
        data: {
          ...dto,
          configJson: dto.configJson !== undefined ? (dto.configJson as Prisma.InputJsonValue) : undefined,
        },
      }),
      ...screenIds.map(screenId =>
        this.prisma.screen.update({
          where: { id: screenId },
          data: { contentHash: null },
        })
      ),
    ]);
  }
}
