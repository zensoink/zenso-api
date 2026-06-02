import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Header, Param, ParseIntPipe, Post, StreamableFile, UseGuards } from '@nestjs/common';

import { RenderScreenDTO } from './dto/render-screen.dto';
import { RenderOrchestratorService } from './services/render-orchestrator.service';

@Controller('screens')
@UseGuards(UserJwtAuthGuard)
export class RenderController {
  constructor(private readonly renderOrchestratorService: RenderOrchestratorService) {}

  @Post(':id/render/preview')
  @Header('Content-Type', 'image/png')
  async renderPreview(@Param('id', ParseIntPipe) id: number, @Body() dto?: RenderScreenDTO): Promise<StreamableFile> {
    const { buffer: png } = await this.renderOrchestratorService.renderPreview(id, dto?.context);
    return new StreamableFile(png);
  }

  @Post(':id/render/device')
  @Header('Content-Type', 'application/octet-stream')
  async renderForDevice(@Param('id', ParseIntPipe) id: number, @Body() dto?: RenderScreenDTO): Promise<StreamableFile> {
    const { buffer: raw } = await this.renderOrchestratorService.renderForDevice(id, dto?.context);
    return new StreamableFile(raw);
  }
}
