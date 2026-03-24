import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import { Liquid } from 'liquidjs';
import * as os from 'os';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class WidgetsService {
  private readonly engine = new Liquid();
  private readonly EINK_PALETTE = ['#000000', '#ffffff', '#00ff00', '#0000ff', '#ff0000', '#ffff00', '#ff8000'];

  async renderWidget(template: string, width: number, height: number, data: any): Promise<Buffer> {
    const content = (await this.engine.parseAndRender(template, data)) as string;

    const html = `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="UTF-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #ffffff; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height });
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      });

      return await this.applyEinkEffect(Buffer.from(screenshot));
    } finally {
      await browser.close();
    }
  }

  private async applyEinkEffect(inputBuffer: Buffer): Promise<Buffer> {
    const timestamp = Date.now();
    const tempIn = path.join(os.tmpdir(), `in_${timestamp}.png`);
    const tempPalette = path.join(os.tmpdir(), `pal_${timestamp}.png`);
    const tempOut = path.join(os.tmpdir(), `out_${timestamp}.bmp`);

    try {
      await fs.writeFile(tempIn, inputBuffer);

      const colorPoints = this.EINK_PALETTE.map((color, i) => `-fill "${color}" -draw "point ${i},0"`).join(' ');
      await execPromise(`convert -size 7x1 xc:none ${colorPoints} "${tempPalette}"`);

      const command = `convert "${tempIn}" \
      -resize 800x480^ -gravity center -extent 800x480 \
      -brightness-contrast 10x30 \
      -remap "${tempPalette}" \
      -compress none \
      -type Palette \
      -depth 4 \
      -define bmp:format=bmp3 \
      -colors 16 \
      BMP3:"${tempOut}"`;

      await execPromise(command);
      return await fs.readFile(tempOut);
    } catch (error) {
      console.error('ImageMagick err:', error);
      throw error;
    } finally {
      await Promise.all([
        fs.unlink(tempIn).catch(() => {}),
        fs.unlink(tempPalette).catch(() => {}),
        fs.unlink(tempOut).catch(() => {}),
      ]);
    }
  }
}
