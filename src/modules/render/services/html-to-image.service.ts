import { getWidgetTemplate, RenderEngineService } from '@modules/widgets/services/render-engine.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HtmlToImageService {
  constructor(private readonly renderEngineService: RenderEngineService) {}

  async render(params: { html: string; width: number; height: number }): Promise<Buffer> {
    const fullHtml = getWidgetTemplate(params.html, {
      width: params.width,
      height: params.height,
    });

    return this.renderEngineService.renderHtmlToPng(fullHtml, params.width, params.height);
  }
}
