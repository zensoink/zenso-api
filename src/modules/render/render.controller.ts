import { UserJwtAuthGuard } from '@modules/auth';
import { Controller, Get, Header, Param, ParseIntPipe, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RenderOrchestratorService } from './services/render-orchestrator.service';

@ApiTags('screens')
@ApiBearerAuth('user-jwt')
@Controller('screens')
@UseGuards(UserJwtAuthGuard)
export class RenderController {
  constructor(private readonly renderOrchestratorService: RenderOrchestratorService) {}

  @Get(':id/render/preview')
  @Header('Content-Type', 'image/png')
  @ApiOperation({
    summary: 'Render preview image for screen',
    description:
      'Renders the full screen composition (all slot templates executed, composed, and composited) ' +
      'into a PNG preview image. Always re-renders with live data, never served from cache. ' +
      'This is useful for testing layout and content before deploying to a device.',
  })
  @ApiResponse({
    status: 200,
    description: 'PNG image buffer',
    content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 404, description: 'Screen not found' })
  async renderPreview(@Param('id', ParseIntPipe) id: number): Promise<StreamableFile> {
    const { buffer: png } = await this.renderOrchestratorService.renderPreview(id);
    return new StreamableFile(png);
  }
}
