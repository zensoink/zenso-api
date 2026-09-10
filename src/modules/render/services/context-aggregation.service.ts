import { PrismaService } from '@core/prisma';
import { resolveTimeZone, tzOffsetMinutes } from '@modules/data-sources/timezone';
import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

export interface ZensoUserContext {
  id: string;
  name: string | null;
  first_name: string;
  locale: string;
  language: string;
  time_zone_iana: string;
  utc_offset: number;
}

export interface ZensoDeviceContext {
  id: string | null;
  friendly_id: string | null;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
}

export interface ZensoSystemContext {
  timestamp_utc: number;
  core_version: string;
  firmware_version: string;
}

export interface ZensoPluginContext {
  id: string | null;
  name: string | null;
  version: string | null;
  description: string | null;
  thumbnail: string | null;
  author: Record<string, unknown> | null;
  license: string | null;
  core_min: string | null;
}

export interface ZensoContext {
  user: ZensoUserContext;
  device: ZensoDeviceContext;
  system: ZensoSystemContext;
}

export interface AggregatedContext {
  zenso: ZensoContext;
  plugin: ZensoPluginContext;
  config: Record<string, unknown>;
  data?: Record<string, unknown>;
  width: number;
  height: number;
  [key: string]: unknown;
}

@Injectable()
export class ContextAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  async buildContext(params: {
    screenId: number;
    runtimeData?: Record<string, unknown>;
    configJson?: Record<string, unknown>;
    manifestJson?: Record<string, unknown>;
    pluginVersion?: string;
    width: number;
    height: number;
  }): Promise<AggregatedContext> {
    const screen = await this.prisma.screen.findUnique({
      where: { id: params.screenId },
      include: { device: true, user: true },
    });

    if (!screen) {
      throw new NotFoundException(`Screen ${params.screenId} not found`);
    }

    const orientation: 'landscape' | 'portrait' = params.width > params.height ? 'landscape' : 'portrait';
    const timeZoneIana = resolveTimeZone(screen.timeZoneIana, screen.user.timeZoneIana);
    const now = new Date();
    const timestampUtc = Math.floor(now.getTime() / 1000);
    const utcOffset = Math.round(tzOffsetMinutes(timeZoneIana, now) * 60);
    const coreVersion = process.env.npm_package_version ?? '0.0.0';
    const firmwareVersion = screen.device?.firmwareVersion ?? '0.0.0';
    const firstName = screen.user.name?.split(' ')[0] || 'Tytus';

    const plugin: ZensoPluginContext = {
      id: z
        .string()
        .nullable()
        .parse(params.manifestJson?.['id'] ?? null),
      name: z
        .string()
        .nullable()
        .parse(params.manifestJson?.['name'] ?? null),
      version: params.pluginVersion ?? null,
      description: z
        .string()
        .nullable()
        .parse(params.manifestJson?.['description'] ?? null),
      thumbnail: z
        .string()
        .nullable()
        .parse(params.manifestJson?.['thumbnail'] ?? null),
      author: z
        .record(z.string(), z.unknown())
        .nullable()
        .parse(params.manifestJson?.['author'] ?? null),
      license: z
        .string()
        .nullable()
        .parse(params.manifestJson?.['license'] ?? null),
      core_min: z
        .string()
        .nullable()
        .parse(params.manifestJson?.['core_min'] ?? null),
    };

    return {
      zenso: {
        user: {
          id: `user_${screen.user.id}`,
          name: screen.user.name ?? null,
          first_name: firstName,
          locale: 'pl-PL',
          language: 'pl',
          time_zone_iana: timeZoneIana,
          utc_offset: utcOffset,
        },
        device: {
          id: screen.device?.hardwareId ?? null,
          friendly_id: screen.device?.hardwareId ?? null,
          width: params.width,
          height: params.height,
          orientation,
        },
        system: {
          timestamp_utc: timestampUtc,
          core_version: coreVersion,
          firmware_version: firmwareVersion,
        },
      },
      plugin,
      config: params.configJson ?? {},
      ...params.runtimeData,
      width: params.width,
      height: params.height,
    };
  }
}
