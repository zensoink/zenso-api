import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import { ditherImage } from 'epdoptimize';
import { Liquid } from 'liquidjs';
import puppeteer, { Browser } from 'puppeteer';
import sharp from 'sharp';

export type RenderMode = 'photo' | 'ui';

function escapeSrcdoc(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getWidgetTemplate(content: string, { width, height }: { width: number; height: number }): string {
  return `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'none'; img-src 'self' data:; font-src 'self' data:; frame-src 'self'; frame-ancestors 'none';" />
          <style>
            html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: #ffffff; }
            iframe { border: none; width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <iframe sandbox="" srcdoc="${escapeSrcdoc(content)}" width="${width}" height="${height}"></iframe>
        </body>
      </html>
    `;
}

@Injectable()
export class RenderEngineService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;

  private readonly logger = new Logger(RenderEngineService.name);
  private readonly liquid = new Liquid();

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

  async renderWidget({
    template,
    width,
    height,
    data,
    palette,
    mode = 'photo',
    outputFormat = 'raw',
  }: {
    template: string;
    width: number;
    height: number;
    data: Record<string, unknown>;
    palette: string[];
    mode?: RenderMode;
    outputFormat?: 'raw' | 'png';
  }): Promise<Buffer> {
    const content = (await this.liquid.parseAndRender(template, { ...data, width, height })) as string;
    const html = getWidgetTemplate(content, { width, height });

    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html);
      await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      });

      const sharpBuffer = await sharp(screenshot)
        .resize(width, height, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
        .modulate({
          brightness: 1.03,
          saturation: 0.95,
        })
        .linear(1.08, -8)
        .flatten({ background: '#ffffff' })
        .png()
        .toBuffer();

      const ditheredCanvas = await this.applyDithering(sharpBuffer, width, height, palette, mode);

      if (outputFormat === 'png') {
        return ditheredCanvas.toBuffer('image/png');
      }

      const packedRaw = this.canvasToPackedRaw4bpp(ditheredCanvas, width, height, palette);

      this.logger.debug(`Generated RAW4 buffer: ${packedRaw.length} bytes (Expected: ${(width * height) / 2})`);

      return packedRaw;
    } catch (err) {
      this.logger.error('Rendering error:', err);
      throw err;
    } finally {
      await page.close().catch(() => {});
    }
  }

  async renderHtmlToPng(html: string, width: number, height: number): Promise<Buffer> {
    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`data:text/html,${encodeURIComponent(html)}`);
      await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      });

      return Buffer.from(screenshot);
    } catch (err) {
      this.logger.error('HTML-to-PNG rendering error:', err);
      throw err;
    } finally {
      await page.close().catch(() => {});
    }
  }

  async renderFileToPng(filePath: string, width: number, height: number): Promise<Buffer> {
    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`file://${filePath}`);
      await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      });

      return Buffer.from(screenshot);
    } catch (err) {
      this.logger.error('File-to-PNG rendering error:', err);
      throw err;
    } finally {
      await page.close().catch(() => {});
    }
  }

  private async applyDithering(
    inputBuffer: Buffer,
    width: number,
    height: number,
    palette: string[],
    mode: RenderMode
  ) {
    const sourceImage = await loadImage(inputBuffer);
    const inputCanvas = createCanvas(width, height);
    const outputCanvas = createCanvas(width, height);

    const inputCtx = inputCanvas.getContext('2d');
    inputCtx.drawImage(sourceImage, 0, 0, width, height);

    await ditherImage(inputCanvas, outputCanvas, {
      ditheringType: mode === 'photo' ? 'errorDiffusion' : 'quantizationOnly',
      errorDiffusionMatrix: 'floydSteinberg',
      serpentine: true,
      palette,
    });

    return outputCanvas;
  }

  private canvasToPackedRaw4bpp(
    canvas: ReturnType<typeof createCanvas>,
    width: number,
    height: number,
    palette: string[]
  ): Buffer {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const rgba = imageData.data;

    const paletteMap = new Map<string, number>();
    palette.forEach((hex, index) => {
      paletteMap.set(this.normalizeHex(hex), index);
    });

    const output = Buffer.alloc(Math.ceil((width * height) / 2));

    let outIndex = 0;
    for (let i = 0; i < rgba.length; i += 8) {
      const p1 = this.rgbToPaletteIndex(rgba[i], rgba[i + 1], rgba[i + 2], paletteMap, palette);

      let p2 = 1;
      if (i + 4 < rgba.length) {
        p2 = this.rgbToPaletteIndex(rgba[i + 4], rgba[i + 5], rgba[i + 6], paletteMap, palette);
      }

      output[outIndex++] = ((p1 & 0x0f) << 4) | (p2 & 0x0f);
    }

    return output;
  }

  private rgbToPaletteIndex(
    r: number,
    g: number,
    b: number,
    paletteMap: Map<string, number>,
    palette: string[]
  ): number {
    const hex = this.rgbToHex(r, g, b);
    const exact = paletteMap.get(hex);
    if (exact !== undefined) return exact;

    let bestIndex = 0;
    let bestDist = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < palette.length; i++) {
      const { r: pr, g: pg, b: pb } = this.hexToRgb(palette[i]);
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const dist = dr * dr + dg * dg + db * db;

      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map(v => v.toString(16).padStart(2, '0'))
        .join('')
        .toLowerCase()
    );
  }

  private normalizeHex(hex: string): string {
    const clean = hex.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(clean)) return clean;
    throw new BadRequestException(`Invalid palette color: ${hex}`);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = this.normalizeHex(hex);
    return {
      r: Number.parseInt(clean.slice(1, 3), 16),
      g: Number.parseInt(clean.slice(3, 5), 16),
      b: Number.parseInt(clean.slice(5, 7), 16),
    };
  }
}
