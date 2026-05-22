import { Body, Controller, Header, Param, ParseIntPipe, Post, StreamableFile } from '@nestjs/common';

import { RenderScreenDTO } from './dto/render-screen.dto';
import { RenderOrchestratorService } from './services/render-orchestrator.service';

@Controller('screens')
export class RenderController {
  constructor(private readonly renderOrchestratorService: RenderOrchestratorService) {}

  @Post(':id/render')
  @Header('Content-Type', 'image/png')
  async render(@Param('id', ParseIntPipe) id: number, @Body() dto?: RenderScreenDTO): Promise<StreamableFile> {
    const png = await this.renderOrchestratorService.render(id, dto?.context);
    return new StreamableFile(png);
  }
}
