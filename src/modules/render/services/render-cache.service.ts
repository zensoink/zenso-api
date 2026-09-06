import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { SlotRenderInput } from '../types/slot-render-input';

interface CacheEntry {
  data: Buffer;
  expiresAt: number;
}

@Injectable()
export class RenderCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  generateKey(
    screenId: number,
    screenWidth: number,
    screenHeight: number,
    slots: SlotRenderInput[],
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

  set(key: string, data: Buffer, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
