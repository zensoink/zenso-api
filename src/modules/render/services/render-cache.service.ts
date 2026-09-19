import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { SlotRenderInput } from '../types/slot-render-input';

interface CacheEntry {
  screenId?: number;
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

  set(key: string, data: Buffer, ttlMs: number, screenId?: number): void {
    this.cache.set(key, {
      screenId,
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidateScreen(screenId: number): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.screenId === screenId) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
