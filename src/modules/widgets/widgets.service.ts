import { exec, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Liquid } from 'liquidjs';
import puppeteer, { Browser } from 'puppeteer';

import { getWidgetTemplate } from './widgets.utils';

const execPromise = promisify(exec);

@Injectable()
export class WidgetsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WidgetsService.name);
  private readonly engine = new Liquid();
  private browser: Browser;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }

  async onModuleDestroy() {
    if (this.browser) await this.browser.close();
  }

  async renderWidget({
    template,
    width,
    height,
    data,
    palette,
  }: {
    template: string;
    width: number;
    height: number;
    data: Record<any, any>;
    palette: string[];
  }): Promise<Buffer> {
    const content = (await this.engine.parseAndRender(template, data)) as string;
    const html = getWidgetTemplate(content, { width, height });
    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width, height });
      await page.setContent(html, { waitUntil: 'networkidle2' });

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      });

      return await this.applyDynamicEinkEffect(screenshot as Buffer, width, height, palette);
    } finally {
      await page.close();
    }
  }

  private async applyDynamicEinkEffect(
    inputBuffer: Buffer,
    width: number,
    height: number,
    palette: string[]
  ): Promise<Buffer> {
    const tempPalette = path.join(os.tmpdir(), `palette-${randomUUID()}.png`);

    try {
      const colorPoints = palette.map((color, i) => `-fill "${color}" -draw "point ${i},0"`).join(' ');
      await execPromise(`convert -size ${palette.length}x1 xc:none ${colorPoints} "${tempPalette}"`);

      return await new Promise((resolve, reject) => {
        const args = [
          'png:-', // 1. Input: Read from stdin

          // 2. Geometry and Cropping
          ['-resize', `${width}x${height}^`],
          ['-gravity', 'center'],
          ['-extent', `${width}x${height}`],

          // 3. Image Correction
          ['-brightness-contrast', '10x30'],

          // 4. E-ink Color Processing
          ['-dither', 'FloydSteinberg'],
          ['-remap', tempPalette],
          ['-type', 'Palette'],
          ['-depth', '4'],

          // 5. Output Format
          ['-define', 'bmp:format=bmp3'],
          'BMP3:-', // Output: Write to stdout
        ].flat();

        const magick = spawn('convert', args);
        const chunks: Buffer[] = [];
        const errorChunks: Buffer[] = [];

        magick.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
        magick.stderr.on('data', (chunk: Buffer) => errorChunks.push(chunk));

        magick.on('close', code => {
          if (code === 0) {
            resolve(Buffer.concat(chunks));
          } else {
            const errorMsg = Buffer.concat(errorChunks).toString();
            this.logger.error(`ImageMagick conversion failed: ${errorMsg}`);
            reject(new Error(`ImageMagick Error: ${errorMsg}`));
          }
        });

        magick.stdin.write(inputBuffer);
        magick.stdin.end();
      });
    } catch (err) {
      this.logger.error('E-ink effect error:', err);
      throw err;
    } finally {
      await fs.unlink(tempPalette).catch(() => {});
    }
  }
}
