import { PrismaService } from '@core/prisma';
import { DeviceJwtAuthGuard, UserJwtAuthGuard } from '@modules/auth';
import { getAllDisplayProfiles, getDisplayProfile, RenderOrchestratorService } from '@modules/render';
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
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
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
import { DisplayProfileResponseDto } from './dto/display-profile-response.dto';
import { ForceRefreshResponseDto } from './dto/force-refresh-response.dto';
import { RotateDeviceSecretResponseDto } from './dto/rotate-device-secret-response.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

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
  @ApiOperation({
    summary: 'Create device and generate secret',
    description:
      'Creates a new device record associated with the authenticated user, using the caller-supplied ' +
      'canonical hardware ID (12 uppercase hex chars, MAC without separators). ' +
      'Generates a secret that is returned only once in the response ' +
      'and must be stored securely by the caller (e.g., flashed onto the device during manufacturing).',
  })
  @ApiBearerAuth('user-jwt')
  @ApiBody({ type: CreateDeviceDto })
  @ApiCreatedResponse({ type: CreateDeviceResponseDto, description: 'Device created, rawSecret shown once' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateDeviceDto, @Req() req: { user: { userId: number } }) {
    return this.devicesService.createDevice(req.user.userId, dto);
  }

  @Get()
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'List user devices',
    description: 'Returns all devices owned by the authenticated user, including revoked ones.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: DeviceResponseDto, isArray: true, description: 'List of user devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Req() req: { user: { userId: number } }) {
    return this.devicesService.findAll(req.user.userId);
  }

  @Get('display-profiles')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'Get display profiles catalog',
    description:
      'Returns all supported physical display models and their hardware specifications, ' +
      'nibble mappings, calibrated pigments, and allowed color palette presets.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({
    type: DisplayProfileResponseDto,
    isArray: true,
    description: 'List of supported display profiles',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getDisplayProfiles() {
    return getAllDisplayProfiles();
  }

  @Get('display')
  @UseGuards(DeviceJwtAuthGuard)
  @ApiOperation({
    summary: 'Get rendered display image for device',
    description:
      "Returns the current rendered display image for the device's active screen. " +
      'Supports ETag-based caching — send If-None-Match header to get a 304 response when ' +
      'content hasn\'t changed. Format query param: "raw" (EPD-binary, default) or "png" (preview).',
  })
  @ApiBearerAuth('device-jwt')
  @ApiResponse({ status: 200, description: 'Raw EPD image or PNG preview' })
  @ApiResponse({ status: 304, description: 'Not modified (ETag match)' })
  @ApiResponse({ status: 400, description: 'Invalid format query parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device or active screen not found' })
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

    const profile = getDisplayProfile(device.displayProfile);
    res.set('Cache-Control', 'no-cache');
    res.set('X-Display-Profile', device.displayProfile ?? 'spectra6_7in3');
    res.set('X-Display-Width', (device.width ?? 800).toString());
    res.set('X-Display-Height', (device.height ?? 480).toString());
    res.set('X-Display-Bpp', '4');
    res.set('X-Display-Rotation', (device.rotation ?? 0).toString());
    res.set('X-Display-Nibbles', profile.nibbleHeaderString);

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

  @Get(':id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'Get device by ID',
    description: 'Returns a single device by ID, scoped to the authenticated user.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: DeviceResponseDto, description: 'Device details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  findById(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { userId: number } }) {
    return this.devicesService.findById(id, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'Update device settings',
    description:
      'Updates hardware and display configuration for a device owned by the authenticated user. ' +
      'Invalidates screen render cache if display parameters change.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiBody({ type: UpdateDeviceDto })
  @ApiOkResponse({ type: DeviceResponseDto, description: 'Updated device details' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeviceDto,
    @Req() req: { user: { userId: number } }
  ) {
    return this.devicesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(UserJwtAuthGuard)
  @ApiOperation({
    summary: 'Revoke or delete device',
    description:
      'Soft-deletes (revokes) a device by default or permanently removes it when hard=true ' +
      'query parameter is passed. Unlinks any assigned screens and invalidates render cache.',
  })
  @ApiBearerAuth('user-jwt')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Device revoked or deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  revoke(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { userId: number } },
    @Query('hard') hardParam?: string
  ) {
    const hard = hardParam === 'true';
    return this.devicesService.revoke(id, req.user.userId, hard);
  }

  @Post(':id/force-refresh')
  @UseGuards(UserJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force refresh device display',
    description:
      'Purges server render cache and clears content hash for all screens assigned to this device, ' +
      'causing the device to fetch a fresh render on its next check-in.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: ForceRefreshResponseDto, description: 'Force refresh triggered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  forceRefresh(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { userId: number } }) {
    return this.devicesService.forceRefresh(id, req.user.userId);
  }

  @Post('check-in')
  @UseGuards(DeviceJwtAuthGuard)
  @ApiOperation({
    summary: 'Device check-in to report status and receive config',
    description:
      'Called periodically by the device to report its firmware version and receive the ' +
      'current configuration: screen dimensions, palette, refresh rate, render mode, ' +
      'and whether the display image has changed (contentChanged flag).',
  })
  @ApiBearerAuth('device-jwt')
  @ApiBody({ type: DeviceCheckInDto })
  @ApiResponse({
    status: 200,
    type: DeviceStatusResponseDto,
    description: 'Check-in accepted, returns config and next refresh interval',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkIn(
    @Req() req: { user: { deviceId: number } },
    @Body() dto: DeviceCheckInDto
  ): Promise<DeviceStatusResponseDto> {
    return this.devicesService.checkIn(req.user.deviceId, dto);
  }

  @Post(':id/rotate-secret')
  @UseGuards(UserJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate device secret (admin)',
    description:
      'Generates a new secret for a device, invalidating the old one. The new secret ' +
      'is returned once — the device must be re-flashed with it. Useful for security rotations.',
  })
  @ApiBearerAuth('user-jwt')
  @ApiOkResponse({ type: RotateDeviceSecretResponseDto, description: 'Device secret rotated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async rotateSecret(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { userId: number } }) {
    return this.devicesService.rotateSecret(id, req.user.userId);
  }
}
