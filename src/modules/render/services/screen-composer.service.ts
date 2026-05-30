import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { RenderedSlot } from './screen-render.service';

@Injectable()
export class ScreenComposerService {
  async compose(params: { width: number; height: number; slots: RenderedSlot[] }): Promise<Buffer> {
    if (params.slots.length === 0) {
      return sharp({
        create: {
          width: params.width,
          height: params.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
    }

    const layers = params.slots
      .sort((a, b) => a.zIndex - b.zIndex)
      .map(slot => ({
        input: slot.pngBuffer,
        left: slot.x,
        top: slot.y,
      }));

    return sharp({
      create: {
        width: params.width,
        height: params.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite(layers)
      .png()
      .toBuffer();
  }
}
