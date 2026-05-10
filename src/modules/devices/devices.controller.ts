import { PrismaService } from '@core/prisma';
import { WidgetsService } from '@modules/widgets/widgets.service';
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
    private readonly widgetsService: WidgetsService
  ) {}

  @Get(':uid/display')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getDisplay(
    @Param('uid') uid: string,
    @Query('slot') slotParam?: string,
    @Query('format') formatParam?: string
  ): Promise<StreamableFile> {
    const slotIndex = slotParam ? parseInt(slotParam, 10) : 0;
    const format: 'png' | 'raw' = formatParam === 'png' ? 'png' : 'raw';

    if (isNaN(slotIndex) || slotIndex < 0) {
      throw new NotFoundException('Invalid slot index');
    }

    if (formatParam && formatParam !== 'raw' && formatParam !== 'png') {
      throw new BadRequestException('Invalid format. Allowed values: raw, png');
    }

    const device = await this.prisma.device.findUnique({
      where: { uid },
      include: {
        slots: {
          include: { widget: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (!device.slots.length) {
      throw new NotFoundException('No widgets configured for device');
    }

    const slot = device.slots[slotIndex];
    if (!slot) {
      throw new NotFoundException(`Slot ${slotIndex} not found`);
    }

    const buffer = await this.widgetsService.renderWidget({
      template: slot.widget.template,
      width: device.width,
      height: device.height,
      data: {
        deviceName: device.name,
      },
      palette: device.palette,
      outputFormat: format,
    });

    return new StreamableFile(buffer, {
      // 'image/raw' nie jest standardem. Użyj octet-stream dla surowych danych.
      type: format === 'png' ? 'image/png' : 'application/octet-stream',
      // Opcjonalnie możesz dodać nazwę pliku, co ułatwia debugowanie w przeglądarce
      disposition: `attachment; filename="display.${format}"`,
    });
  }
}
