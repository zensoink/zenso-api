import * as path from 'node:path';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import puppeteer, { Browser, HTTPRequest, Page } from 'puppeteer';

interface RenderOptions {
  waitForReady?: boolean;
  timeZone?: string;
}

const READY_POLL_INTERVAL_MS = 100;
const READY_TIMEOUT_MS = 5000;

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

  async renderHtmlToPng(
    html: string,
    width: number,
    height: number,
    assetDir?: string,
    options?: RenderOptions
  ): Promise<Buffer> {
    const page = await this.browser.newPage();
    const waitForReady = options?.waitForReady === true;

    try {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });

      if (options?.timeZone) {
        await page.emulateTimezone(options.timeZone);
      }

      if (waitForReady) {
        await this.configureRequestGuard(page, assetDir);
      }

      await page.setContent(html, {
        waitUntil: waitForReady ? 'load' : 'networkidle0',
        timeout: 5000,
        ...(assetDir && { baseURL: `file://${assetDir}/` }),
      });

      if (waitForReady) {
        const ready = await this.waitForReady(page);
        if (!ready) {
          this.logger.warn('window.__ZENSO_READY__ not set within 5s - screenshotting anyway');
        }
      }

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

  private async configureRequestGuard(page: Page, assetDir?: string): Promise<void> {
    await page.setRequestInterception(true);
    const allowedRoot = assetDir ? path.resolve(assetDir) : undefined;

    page.on('request', (request: HTTPRequest) => {
      const url = request.url();
      if (url.startsWith('data:') || url.startsWith('about:')) {
        void request.continue().catch(() => undefined);
        return;
      }
      if (allowedRoot && url.startsWith('file://')) {
        let filePath: string;
        try {
          filePath = decodeURIComponent(new URL(url).pathname);
        } catch {
          void request.abort().catch(() => undefined);
          return;
        }
        if (!path.relative(allowedRoot, filePath).startsWith('..')) {
          void request.continue().catch(() => undefined);
          return;
        }
      }
      void request.abort().catch(() => undefined);
    });
  }

  private async waitForReady(page: Page): Promise<boolean> {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      let ready = false;
      try {
        ready = await page.evaluate(() => Reflect.get(globalThis, '__ZENSO_READY__') === true);
      } catch {
        ready = false;
      }
      if (ready) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, READY_POLL_INTERVAL_MS));
    }
    return false;
  }
}
