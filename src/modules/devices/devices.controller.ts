import { PrismaService } from '@core/prisma';
import { RenderOrchestratorService } from '@modules/render/services/render-orchestrator.service';
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renderOrchestratorService: RenderOrchestratorService
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
}
