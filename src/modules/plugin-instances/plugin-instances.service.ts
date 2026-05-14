import { PrismaService } from '@core/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreatePluginInstanceDTO } from './dto/create-plugin-instance.dto';

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
}
