import { PrismaService } from '@core/prisma';
import { toPrismaJson } from '@core/prisma/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreatePluginInstanceDTO } from './dto/create-plugin-instance.dto';
import { UpdatePluginInstanceDTO } from './dto/update-plugin-instance.dto';

@Injectable()
export class PluginInstancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreatePluginInstanceDTO) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id: dto.pluginId } });
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return this.prisma.pluginInstance.create({
      data: {
        pluginId: dto.pluginId,
        pluginVersionId: dto.pluginVersionId,
        name: dto.name,
        configJson: toPrismaJson(dto.configJson ?? Prisma.JsonNull),
        executionMode: dto.executionMode ?? 'local',
        isEnabled: dto.isEnabled ?? true,
        userId,
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
      include: { plugin: true, pluginVersion: true },
    });
    if (!instance) {
      throw new NotFoundException('PluginInstance not found');
    }
    return instance;
  }

  async remove(id: number) {
    const existing = await this.prisma.pluginInstance.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('PluginInstance not found');
    }

    return this.prisma.pluginInstance.delete({ where: { id } });
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

    const [updated] = await this.prisma.$transaction([
      this.prisma.pluginInstance.update({
        where: { id },
        data: {
          ...dto,
          configJson: dto.configJson !== undefined ? toPrismaJson(dto.configJson) : undefined,
        },
      }),
      ...screenIds.map(screenId =>
        this.prisma.screen.update({
          where: { id: screenId },
          data: { contentHash: null },
        })
      ),
    ]);

    return updated;
  }
}
