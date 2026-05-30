import { BadRequestException, Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import { ditherImage } from 'epdoptimize';
import sharp from 'sharp';

export type RenderMode = 'photo' | 'ui';

@Injectable()
export class EpdImageService {
  async renderPreview(params: {
    input: Buffer;
    width: number;
    height: number;
    palette: string[];
    mode: RenderMode;
  }): Promise<Buffer> {
    const resized = await sharp(params.input)
      .resize(params.width, params.height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    const ditheredCanvas = await this.applyDithering(resized, params.width, params.height, params.palette);

    return ditheredCanvas.toBuffer('image/png');
  }

  async renderForDevice(params: {
    input: Buffer;
    width: number;
    height: number;
    palette: string[];
    mode: RenderMode;
  }): Promise<Buffer> {
    const preprocessed = await this.preprocess(params.input, params.width, params.height);

    const ditheredCanvas = await this.applyDithering(preprocessed, params.width, params.height, params.palette);

    return this.canvasToPackedRaw4bpp(ditheredCanvas, params.width, params.height, params.palette);
  }

  private async preprocess(input: Buffer, width: number, height: number): Promise<Buffer> {
    return sharp(input)
      .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .modulate({ brightness: 1.03, saturation: 0.95 })
      .linear(1.08, -8)
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
  }

  private async applyDithering(inputBuffer: Buffer, width: number, height: number, palette: string[]) {
    const sourceImage = await loadImage(inputBuffer);
    const inputCanvas = createCanvas(width, height);
    const outputCanvas = createCanvas(width, height);

    const inputCtx = inputCanvas.getContext('2d');
    inputCtx.drawImage(sourceImage, 0, 0, width, height);

    await ditherImage(inputCanvas, outputCanvas, {
      ditheringType: 'errorDiffusion',
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
