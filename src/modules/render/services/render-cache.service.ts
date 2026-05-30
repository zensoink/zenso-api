import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

interface CacheEntry {
  data: Buffer;
  expiresAt: number;
}

@Injectable()
export class RenderCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultTtlMs = 60_000;
  // private readonly defaultTtlMs = 1;

  generateKey(
    screenId: number,
    screenWidth: number,
    screenHeight: number,
    slots: Array<{
      pluginInstanceId: number;
      pluginVersion?: string | null;
      configJson?: unknown;
      x: number;
      y: number;
      w: number;
      h: number;
      zIndex: number;
    }>,
    runtimeData?: Record<string, unknown>
  ): string {
    const payload = {
      screenId,
      width: screenWidth,
      height: screenHeight,
      slots,
      runtimeData,
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  get(key: string): Buffer | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: Buffer, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
