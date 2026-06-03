import { UserJwtAuthGuard } from '@modules/auth';
import { Body, Controller, Get, Header, Param, ParseIntPipe, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RenderScreenDTO } from './dto/render-screen.dto';
import { RenderOrchestratorService } from './services/render-orchestrator.service';

@ApiTags('screens')
@ApiBearerAuth('user-jwt')
@Controller('screens')
@UseGuards(UserJwtAuthGuard)
export class RenderController {
  constructor(private readonly renderOrchestratorService: RenderOrchestratorService) {}

  @Get(':id/render/preview')
  @Header('Content-Type', 'image/png')
  @ApiOperation({ summary: 'Render preview image for screen' })
  @ApiResponse({
    status: 200,
    description: 'PNG image buffer',
    content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
  })
  async renderPreview(@Param('id', ParseIntPipe) id: number, @Body() dto?: RenderScreenDTO): Promise<StreamableFile> {
    const { buffer: png } = await this.renderOrchestratorService.renderPreview(id, dto?.context);
    return new StreamableFile(png);
  }
}
