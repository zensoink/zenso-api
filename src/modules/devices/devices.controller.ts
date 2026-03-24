import { PrismaService } from '@core/prisma';
import { WidgetsService } from '@modules/widgets/widgets.service';
import { Controller, Get, Header, NotFoundException, Param, Query, StreamableFile } from '@nestjs/common';

@Controller('v1/devices')
export class DevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly widgetsService: WidgetsService
  ) {}

  @Get(':uid/display')
  @Header('Content-Type', 'image/bmp')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getDisplay(@Param('uid') uid: string, @Query('slot') slotParam?: string): Promise<StreamableFile> {
    const slotIndex = slotParam ? parseInt(slotParam, 10) : 0;

    if (isNaN(slotIndex) || slotIndex < 0) {
      throw new NotFoundException('Invalid slot index');
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
    });

    return new StreamableFile(buffer);
  }
}
