import { PrismaService } from '@core/prisma';
import { RenderOrchestratorService } from '@modules/render/services/render-orchestrator.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';

import { DevicesService } from './devices.service';
import { DeviceCheckInDto } from './dto/device-check-in.dto';
import { DeviceStatusResponseDto } from './dto/device-status-response.dto';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renderOrchestratorService: RenderOrchestratorService,
    private readonly devicesService: DevicesService
  ) {}

  @Get(':uid/display')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getDisplay(@Param('uid') uid: string, @Query('format') formatParam?: string): Promise<StreamableFile> {
    const format: 'preview' | 'device' = formatParam === 'png' ? 'preview' : 'device';

    if (formatParam && formatParam !== 'raw' && formatParam !== 'png') {
      throw new BadRequestException('Invalid format. Allowed values: raw, png');
    }

    const device = await this.prisma.device.findUnique({
      where: { uid },
      include: {
        screens: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
          take: 1,
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const screen = device.screens[0];
    if (!screen) {
      throw new NotFoundException('No active screen configured for device');
    }

    const buffer = await (format === 'preview'
      ? this.renderOrchestratorService.renderPreview(screen.id)
      : this.renderOrchestratorService.renderForDevice(screen.id));

    return new StreamableFile(buffer, {
      type: format === 'preview' ? 'image/png' : 'application/octet-stream',
      disposition: `attachment; filename="display.${format === 'preview' ? 'png' : 'raw'}"`,
    });
  }

  @Post(':uid/check-in')
  async checkIn(@Param('uid') uid: string, @Body() dto: DeviceCheckInDto): Promise<DeviceStatusResponseDto> {
    return this.devicesService.checkIn(uid, dto);
  }
}
