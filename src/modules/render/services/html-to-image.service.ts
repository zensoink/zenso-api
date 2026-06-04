import { Injectable } from '@nestjs/common';

import { getWidgetTemplate } from '../templates/plugin-iframe.template';
import { BrowserService } from './browser.service';

@Injectable()
export class HtmlToImageService {
  constructor(private readonly browserService: BrowserService) {}

  async render(params: { html: string; width: number; height: number; assetDir?: string }): Promise<Buffer> {
    const fullHtml = getWidgetTemplate(params.html, {
      width: params.width,
      height: params.height,
    });

    return this.browserService.renderHtmlToPng(fullHtml, params.width, params.height, params.assetDir);
  }
}
