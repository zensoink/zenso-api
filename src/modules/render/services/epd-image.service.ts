import { BadRequestException, Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import { ditherImage, replaceColors } from 'epdoptimize';
import sharp from 'sharp';

import { DisplayProfile, getDisplayProfile } from '../config/display-profiles.config';

export type RenderMode = 'photo' | 'ui';

export interface RenderParams {
  input: Buffer;
  width: number;
  height: number;
  palette: string[];
  mode: RenderMode;
  rotation?: number;
  displayProfile?: string;
  epdConfig?: Record<string, unknown> | null;
}

interface ResolvedPalettes {
  ditheringPalette: string[];
  replacePalette: Array<{ color: string; deviceColor: string }>;
}

@Injectable()
export class EpdImageService {
  async renderPreview(params: RenderParams): Promise<Buffer> {
    let pipeline = sharp(params.input);
    if (params.rotation !== undefined) {
      pipeline = pipeline.rotate(params.rotation);
    }

    const resized = await pipeline
      .resize(params.width, params.height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    const profile = getDisplayProfile(params.displayProfile);
    const { ditheringPalette, replacePalette } = this.resolvePalettes(params.palette, profile);

    const ditheredCanvas = await this.applyDithering(
      resized,
      params.width,
      params.height,
      ditheringPalette,
      params.mode,
      params.epdConfig
    );

    const previewCanvas = createCanvas(params.width, params.height);
    replaceColors(ditheredCanvas, previewCanvas, replacePalette);

    return previewCanvas.toBuffer('image/png');
  }

  async renderForDevice(params: RenderParams): Promise<Buffer> {
    const preprocessed = await this.preprocess(params);
    const profile = getDisplayProfile(params.displayProfile);
    const { ditheringPalette } = this.resolvePalettes(params.palette, profile);

    const ditheredCanvas = await this.applyDithering(
      preprocessed,
      params.width,
      params.height,
      ditheringPalette,
      params.mode,
      params.epdConfig
    );

    return this.canvasToPackedRaw4bpp(ditheredCanvas, params.width, params.height, profile);
  }

  private async preprocess(params: RenderParams): Promise<Buffer> {
    let pipeline = sharp(params.input);
    if (params.rotation !== undefined) {
      pipeline = pipeline.rotate(params.rotation);
    }

    return pipeline
      .resize(params.width, params.height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .modulate({ brightness: 1.03, saturation: 0.95 })
      .linear(1.08, -8)
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
  }

  private async applyDithering(
    inputBuffer: Buffer,
    width: number,
    height: number,
    palette: string[],
    mode: RenderMode,
    epdConfig?: Record<string, unknown> | null
  ): Promise<ReturnType<typeof createCanvas>> {
    const sourceImage = await loadImage(inputBuffer);
    const inputCanvas = createCanvas(width, height);
    const outputCanvas = createCanvas(width, height);

    const inputCtx = inputCanvas.getContext('2d');
    inputCtx.drawImage(sourceImage, 0, 0, width, height);

    const processingPreset = mode === 'photo' ? 'dynamic' : 'vivid';

    await ditherImage(inputCanvas, outputCanvas, {
      processingPreset,
      ditheringType: 'errorDiffusion',
      errorDiffusionMatrix: 'floydSteinberg',
      serpentine: true,
      palette,
      colorMatching: 'lab',
      ...(epdConfig ?? {}),
    });

    return outputCanvas;
  }

  private resolvePalettes(userPalette: string[], profile: DisplayProfile): ResolvedPalettes {
    const ditheringPalette: string[] = [];
    const replacePalette: Array<{ color: string; deviceColor: string }> = [];

    const pigmentMap = new Map<string, { hex: string; calibratedHex: string }>();
    for (const pigment of profile.physicalPigments) {
      pigmentMap.set(pigment.hex.toUpperCase(), {
        hex: pigment.hex.toUpperCase(),
        calibratedHex: pigment.calibratedHex.toLowerCase(),
      });
    }

    for (const rawHex of userPalette) {
      const cleanHex = this.normalizeHex(rawHex).toUpperCase();
      const matchedPigment = pigmentMap.get(cleanHex);

      if (matchedPigment) {
        ditheringPalette.push(matchedPigment.calibratedHex);
        replacePalette.push({
          color: matchedPigment.calibratedHex,
          deviceColor: matchedPigment.hex,
        });
      } else {
        const lowerHex = cleanHex.toLowerCase();
        ditheringPalette.push(lowerHex);
        replacePalette.push({
          color: lowerHex,
          deviceColor: cleanHex,
        });
      }
    }

    return { ditheringPalette, replacePalette };
  }

  private canvasToPackedRaw4bpp(
    canvas: ReturnType<typeof createCanvas>,
    width: number,
    height: number,
    profile: DisplayProfile
  ): Buffer {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const rgba = imageData.data;

    const colorToNibbleMap = new Map<string, number>();
    for (const pigment of profile.physicalPigments) {
      colorToNibbleMap.set(pigment.calibratedHex.toLowerCase(), pigment.nibble);
      colorToNibbleMap.set(pigment.hex.toLowerCase(), pigment.nibble);
    }

    const rowBytes = Math.ceil(width / 2);
    const totalBytes = rowBytes * height;
    const output = Buffer.alloc(totalBytes);

    for (let y = 0; y < height; y++) {
      const rowBufferOffset = y * rowBytes;
      const rowPixelOffset = y * width;

      for (let x = 0; x < width; x += 2) {
        const p1Idx = (rowPixelOffset + x) * 4;
        const nibble1 = this.rgbToNibble(rgba[p1Idx], rgba[p1Idx + 1], rgba[p1Idx + 2], colorToNibbleMap, profile);

        let nibble2 = 1;
        if (x + 1 < width) {
          const p2Idx = (rowPixelOffset + x + 1) * 4;
          nibble2 = this.rgbToNibble(rgba[p2Idx], rgba[p2Idx + 1], rgba[p2Idx + 2], colorToNibbleMap, profile);
        }

        const colByteOffset = Math.floor(x / 2);
        output[rowBufferOffset + colByteOffset] = ((nibble1 & 0x0f) << 4) | (nibble2 & 0x0f);
      }
    }

    return output;
  }

  private rgbToNibble(
    r: number,
    g: number,
    b: number,
    colorToNibbleMap: Map<string, number>,
    profile: DisplayProfile
  ): number {
    const hex = this.rgbToHex(r, g, b);
    const exact = colorToNibbleMap.get(hex);
    if (exact !== undefined) return exact;

    let bestNibble = profile.physicalPigments[0]?.nibble ?? 0;
    let bestDist = Number.MAX_SAFE_INTEGER;

    for (const pigment of profile.physicalPigments) {
      const rgb = this.hexToRgb(pigment.calibratedHex);
      const dr = r - rgb.r;
      const dg = g - rgb.g;
      const db = b - rgb.b;
      const dist = dr * dr + dg * dg + db * db;

      if (dist < bestDist) {
        bestDist = dist;
        bestNibble = pigment.nibble;
      }
    }

    return bestNibble;
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
