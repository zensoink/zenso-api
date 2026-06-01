import { createHash } from 'node:crypto';

import { PrismaService } from '@core/prisma';
import { RenderOrchestratorService } from '@modules/render/services/render-orchestrator.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

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

  // Uses @Res() (no passthrough) for full manual response control:
  // - 304 sends no body via res.status(304).end()
  // - 200 sends the buffer via res.status(200).send(buffer)
  @Get(':uid/display')
  async getDisplay(
    @Param('uid') uid: string,
    @Res() res: Response,
    @Query('format') formatParam?: string,
    @Headers('if-none-match') ifNoneMatch?: string
  ): Promise<void> {
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

    // Compute ETag: SHA-256 truncated to 32 hex chars (128 bits), quoted per HTTP spec
    const etag = '"' + createHash('sha256').update(buffer).digest('hex').slice(0, 32) + '"';

    res.set('Cache-Control', 'no-cache');
    res.set('ETag', etag);

    if (ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    res.set('Last-Modified', new Date().toUTCString());
    res.set('Content-Type', format === 'preview' ? 'image/png' : 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="display.${format === 'preview' ? 'png' : 'raw'}"`);
    res.status(200).send(buffer);
  }

  @Post(':uid/check-in')
  async checkIn(@Param('uid') uid: string, @Body() dto: DeviceCheckInDto): Promise<DeviceStatusResponseDto> {
    return this.devicesService.checkIn(uid, dto);
  }
}
