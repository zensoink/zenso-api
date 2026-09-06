import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { IcsSource } from './sources/ics.source';
import { dateStringAt } from './timezone';

export interface DataSourceContext {
  configJson: Record<string, unknown>;
  manifestConfig: Record<string, unknown>;
  timeZoneIana: string;
  today: string;
}

export interface DataSourceHandler {
  readonly type: string;
  resolve(ctx: DataSourceContext): Promise<Record<string, unknown>>;
}

export interface DataSourceDescriptor {
  id: string;
  type: string;
  config?: Record<string, unknown>;
}

interface CacheEntry {
  data: Record<string, unknown>;
  expiresAt: number;
}

const DEFAULT_TTL_SECONDS = 600;

@Injectable()
export class DataSourcesService {
  private readonly registry = new Map<string, DataSourceHandler>();
  private readonly cache = new Map<string, CacheEntry>();
  private readonly logger = new Logger(DataSourcesService.name);

  nowFn: () => Date = () => new Date();

  constructor(private readonly icsSource: IcsSource) {
    this.register(icsSource);
  }

  register(handler: DataSourceHandler): void {
    this.registry.set(handler.type, handler);
  }

  async resolveAll(
    dataSources: DataSourceDescriptor[],
    configJson: Record<string, unknown>,
    timeZoneIana: string,
    pluginInstanceId: number,
    cacheTtlMs?: number
  ): Promise<Record<string, unknown>> {
    const now = this.nowFn();
    const today = dateStringAt(timeZoneIana, now);
    const merged: Record<string, unknown> = {};

    for (const source of dataSources) {
      const handler = this.registry.get(source.type);
      if (!handler) {
        this.logger.warn(`Unknown data source type "${source.type}" - skipping`);
        continue;
      }

      const manifestConfig = source.config ?? {};
      const key = this.cacheKey(pluginInstanceId, source.id, configJson, manifestConfig, timeZoneIana, today);
      const cached = this.cache.get(key);

      let data: Record<string, unknown>;
      if (cached && cached.expiresAt > now.getTime()) {
        data = cached.data;
      } else {
        try {
          data = await handler.resolve({ configJson, manifestConfig, timeZoneIana, today });
        } catch (error: unknown) {
          this.logger.error(`Data source "${source.id}" (${source.type}) failed`, error);
          data = {};
        }
        const ttlMs = cacheTtlMs ?? DEFAULT_TTL_SECONDS * 1000;
        this.cache.set(key, { data, expiresAt: now.getTime() + ttlMs });
      }

      merged[source.id] = data;
    }

    return merged;
  }

  private cacheKey(
    pluginInstanceId: number,
    sourceId: string,
    configJson: Record<string, unknown>,
    manifestConfig: Record<string, unknown>,
    timeZoneIana: string,
    today: string
  ): string {
    const payload = JSON.stringify([configJson, manifestConfig, timeZoneIana, today]);
    return `${pluginInstanceId}|${sourceId}|${createHash('sha256').update(payload).digest('hex')}`;
  }
}
