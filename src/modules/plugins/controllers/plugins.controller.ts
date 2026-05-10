import { Controller, Get } from '@nestjs/common';

@Controller('plugins')
export class PluginsController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
