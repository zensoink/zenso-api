import { Injectable } from '@nestjs/common';

import { BrowserService } from './browser.service';

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
    // Template builds always emit a full document; it goes to Chromium as-is.
    return this.browserService.renderHtmlToPng(params.html, params.width, params.height, params.assetDir, {
      waitForReady: params.waitForReady,
      timeZone: params.timeZone,
    });
  }
}
