import { Injectable } from '@nestjs/common';

import { getWidgetTemplate } from '../templates/plugin-iframe.template';
import { BrowserService } from './browser.service';

function isFullDocument(html: string): boolean {
  const head = html.slice(0, 512).toLowerCase();
  return head.includes('<!doctype html') || head.includes('<html');
}

@Injectable()
export class HtmlToImageService {
  constructor(private readonly browserService: BrowserService) {}
  async render(params: {
    html: string;
    width: number;
    height: number;
    assetDir?: string;
    waitForReady?: boolean;
    timeZone?: string;
  }): Promise<Buffer> {
    // New template builds emit a full document; wrapping it again would nest <html>.
    const fullHtml = isFullDocument(params.html)
      ? params.html
      : getWidgetTemplate(params.html, {
          width: params.width,
          height: params.height,
        });

    return this.browserService.renderHtmlToPng(fullHtml, params.width, params.height, params.assetDir, {
      waitForReady: params.waitForReady,
      timeZone: params.timeZone,
    });
  }
}
