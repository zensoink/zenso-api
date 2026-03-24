import { PrismaService } from '@core/prisma';
import { WidgetsService } from '@modules/widgets/widgets.service';
import { Controller, Get, Header, NotFoundException, Param, StreamableFile } from '@nestjs/common';

@Controller('v1/devices')
export class DevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly widgetsService: WidgetsService
  ) {}

  @Get(':uid/display')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getDisplay(@Param('uid') uid: string): Promise<StreamableFile> {
    const device = await this.prisma.device.findUnique({
      where: { uid },
      include: { slots: { include: { widget: true } } },
    });

    if (!device?.slots.length) {
      throw new NotFoundException('Device or widget not found');
    }

    const slot = device.slots[0];
    const buffer = await this.widgetsService.renderWidget({
      template: slot.widget.template,
      width: device.width,
      height: device.height,
      data: {
        deviceName: device.name,
      },
      palette: ['#000000', '#ffffff', '#00ff00', '#0000ff', '#ff0000', '#ffff00', '#ff8000'],
    });

    return new StreamableFile(buffer);
  }
}
