import { BadRequestException, Injectable } from '@nestjs/common';

import { RenderEngineService, RenderMode } from './services/render-engine.service';

@Injectable()
export class WidgetsService {
  constructor(private readonly renderEngine: RenderEngineService) {}

  async renderWidget(params: {
    template: string;
    width: number;
    height: number;
    data: Record<string, unknown>;
    palette: string[];
    mode?: RenderMode;
    outputFormat?: 'raw' | 'png';
  }): Promise<Buffer> {
    this.validateInputs(params.template, params.width, params.height, params.palette);

    return await this.renderEngine.renderWidget(params);
  }
  private validateInputs(template: string, width: number, height: number, palette: string[]) {
    if (!template) throw new BadRequestException('Template is required');
    if (width < 1 || width > 4096) throw new BadRequestException('Invalid width');
    if (height < 1 || height > 4096) throw new BadRequestException('Invalid height');
    if (!palette || palette.length < 2) throw new BadRequestException('Palette is too small');
    if (palette.length > 16) throw new BadRequestException('Palette can have max 16 colors for 4bpp RAW');
    palette.forEach(c => this.normalizeHex(c));
  }

  private normalizeHex(hex: string): string {
    const clean = hex.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(clean)) return clean;
    throw new BadRequestException(`Invalid palette color: ${hex}`);
  }
}
