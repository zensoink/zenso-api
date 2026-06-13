import { PrismaService } from '@core/prisma';
import { DeviceJwtAuthGuard, UserJwtAuthGuard } from '@modules/auth';
import { RenderOrchestratorService } from '@modules/render';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { CreateDeviceResponseDto } from './dto/create-device-response.dto';
import { DeviceCheckInDto } from './dto/device-check-in.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { DeviceStatusResponseDto } from './dto/device-status-response.dto';
import { RotateDeviceSecretResponseDto } from './dto/rotate-device-secret-response.dto';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderOrchestratorService: RenderOrchestratorService,
    private readonly devicesService: DevicesService
  ) {}

  @Post()
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'Create device and generate secret' })
  @ApiBearerAuth('user-jwt')
  @ApiCreatedResponse({ type: CreateDeviceResponseDto, description: 'Device created, rawSecret shown once' })
  async create(@Body() dto: CreateDeviceDto, @Req() req: { user: { userId: number } }) {
    return this.devicesService.createDevice(req.user.userId, dto);
  }

  @Get()
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'List user devices' })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: DeviceResponseDto, isArray: true, description: 'List of user devices' })
  findAll(@Req() req: { user: { userId: number } }) {
    return this.devicesService.findAll(req.user.userId);
  }

  @Get(':id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: DeviceResponseDto, description: 'Device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  findById(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { userId: number } }) {
    return this.devicesService.findById(id, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({ summary: 'Revoke device (soft delete)' })
  @ApiBearerAuth('user-jwt')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Device revoked' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  revoke(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { userId: number } }) {
    return this.devicesService.revoke(id, req.user.userId);
  }

  @Get('display')
  @UseGuards(DeviceJwtAuthGuard)
  @ApiOperation({ summary: 'Get rendered display image for device' })
  @ApiBearerAuth('device-jwt')
  @ApiResponse({ status: 200, description: 'Raw EPD image or PNG preview' })
  @ApiResponse({ status: 304, description: 'Not modified (ETag match)' })
  @ApiHeader({ name: 'if-none-match', required: false, description: 'ETag from previous response' })
  async getDisplay(
    @Req() req: { user: { deviceId: number } },
    @Res() res: Response,
    @Query('format') formatParam?: string,
    @Headers('if-none-match') ifNoneMatch?: string
  ): Promise<void> {
    const format: 'preview' | 'device' = formatParam === 'png' ? 'preview' : 'device';

    if (formatParam && formatParam !== 'raw' && formatParam !== 'png') {
      throw new BadRequestException('Invalid format. Allowed values: raw, png');
    }

    const device = await this.prisma.device.findUnique({
      where: { id: req.user.deviceId },
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

    const { buffer, contentKey } = await (format === 'preview'
      ? this.renderOrchestratorService.renderPreview(screen.id)
      : this.renderOrchestratorService.renderForDevice(screen.id));

    const etag = contentKey ? '"' + contentKey.slice(0, 32) + '"' : null;

    res.set('Cache-Control', 'no-cache');

    if (etag) {
      res.set('ETag', etag);
    }

    if (etag && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    res.set('Last-Modified', screen.updatedAt.toUTCString());
    res.set('Content-Type', format === 'preview' ? 'image/png' : 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="display.${format === 'preview' ? 'png' : 'raw'}"`);
    res.status(200).send(buffer);

    this.prisma.screen
      .update({
        where: { id: screen.id },
        data: { contentHash: contentKey },
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to persist contentHash', err);
      });
  }

  @Post('check-in')
  @UseGuards(DeviceJwtAuthGuard)
  @ApiOperation({ summary: 'Device check-in to report status and receive config' })
  @ApiBearerAuth('device-jwt')
  @ApiResponse({
    status: 200,
    type: DeviceStatusResponseDto,
    description: 'Check-in accepted, returns config and next refresh interval',
  })
  async checkIn(
    @Req() req: { user: { deviceId: number } },
    @Body() dto: DeviceCheckInDto
  ): Promise<DeviceStatusResponseDto> {
    return this.devicesService.checkIn(req.user.deviceId, dto);
  }

  @Post(':id/rotate-secret')
  @UseGuards(UserJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate device secret (admin)' })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: RotateDeviceSecretResponseDto, description: 'Device secret rotated' })
  async rotateSecret(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { userId: number } }) {
    return this.devicesService.rotateSecret(id, req.user.userId);
  }
}
