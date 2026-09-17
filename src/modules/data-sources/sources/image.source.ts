import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import type { DataSourceContext, DataSourceHandler } from '../data-sources.service';
import { guardedFetchBinary } from '../http/guarded-fetch';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB limit for image assets
const DEFAULT_URL_FIELD = 'url';

export interface ImageOutput {
  src: string | null;
  url: string | null;
  empty_reason: 'unconfigured' | 'fetch_failed' | null;
  fetched_at: string;
}

@Injectable()
export class ImageSource implements DataSourceHandler {
  readonly type = 'image';

  private readonly logger = new Logger(ImageSource.name);

  async resolve(ctx: DataSourceContext): Promise<Record<string, unknown>> {
    const urlField = z.string().optional().parse(ctx.manifestConfig['url_field']) ?? DEFAULT_URL_FIELD;
    const rawUrl = ctx.configJson[urlField];
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const now = new Date();

    if (!url) {
      return {
        src: null,
        url: null,
        empty_reason: 'unconfigured',
        fetched_at: now.toISOString(),
      };
    }

    try {
      const { buffer, contentType } = await guardedFetchBinary(url, {
        allowPrivateLan: true,
        maxBodyBytes: MAX_IMAGE_BYTES,
        timeoutMs: 8000,
      });

      const mime = contentType.split(';')[0].trim().toLowerCase() || 'image/jpeg';
      const base64 = buffer.toString('base64');

      return {
        src: `data:${mime};base64,${base64}`,
        url,
        empty_reason: null,
        fetched_at: now.toISOString(),
      };
    } catch (error: unknown) {
      this.logger.warn(`Failed to load image from "${url}"`, error);
      return {
        src: null,
        url,
        empty_reason: 'fetch_failed',
        fetched_at: now.toISOString(),
      };
    }
  }
}
