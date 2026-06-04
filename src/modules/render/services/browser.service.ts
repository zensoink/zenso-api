import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class BrowserService implements OnModuleInit, OnModuleDestroy {
  private browser!: Browser;

  private readonly logger = new Logger(BrowserService.name);

  async onModuleInit() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      this.logger.log('Puppeteer browser launched successfully');
    } catch (error) {
      this.logger.error('Failed to launch Puppeteer browser', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.browser) await this.browser.close();
  }

  async renderHtmlToPng(html: string, width: number, height: number, assetDir?: string): Promise<Buffer> {
    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 5000,
        ...(assetDir && { baseURL: `file://${assetDir}/` }),
      });

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      });

      return Buffer.from(screenshot);
    } catch (err) {
      this.logger.error('HTML-to-PNG rendering error:', err);
      throw err;
    } finally {
      await page.close().catch((err: unknown) => {
        this.logger.warn('Failed to close page', err);
      });
    }
  }
}
