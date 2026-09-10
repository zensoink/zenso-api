import { PrismaService } from '@core/prisma';
import { resolveTimeZone, tzOffsetMinutes } from '@modules/data-sources/timezone';
import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

export interface ZensoUserContext {
  id: string;
  name: string | null;
  firstName: string;
  locale: string;
  language: string;
  timeZoneIana: string;
  utcOffset: number;
  // Canonical snake_case aliases (zenso-plugin-template contract, mock/zenso.json)
  first_name: string;
  time_zone_iana: string;
  utc_offset: number;
}

export interface ZensoDeviceContext {
  id: string | null;
  friendlyId: string | null;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
}

export interface ZensoSystemContext {
  timestampUtc: number;
  coreVersion: string;
  firmwareVersion: string;
  // Canonical snake_case aliases (zenso-plugin-template contract, mock/zenso.json)
  timestamp_utc: number;
  core_version: string;
  firmware_version: string;
}

export interface ZensoManifestContext {
  id: string | null;
  name: string | null;
  version: string | null;
  description: string | null;
  thumbnail: string | null;
  author: Record<string, unknown> | null;
  license: string | null;
  coreMin: string | null;
  // Canonical snake_case alias (zenso-plugin-template contract: plugin.core_min)
  core_min: string | null;
}

export interface ZensoContext {
  user: ZensoUserContext;
  device: ZensoDeviceContext;
  system: ZensoSystemContext;
}

export interface AggregatedContext {
  zenso: ZensoContext;
  manifest: ZensoManifestContext;
  // Canonical alias of `manifest` (zenso-plugin-template contract: plugin scope,
  // identity from package.json + id from zenso.config.json)
  plugin: ZensoManifestContext;
  config: Record<string, unknown>;
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

    const manifest: ZensoManifestContext = {
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
      coreMin: z
        .string()
        .nullable()
        .parse(params.manifestJson?.['core_min'] ?? null),
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
          firstName,
          locale: 'pl-PL',
          language: 'pl',
          timeZoneIana,
          utcOffset,
          first_name: firstName,
          time_zone_iana: timeZoneIana,
          utc_offset: utcOffset,
        },
        device: {
          id: screen.device?.hardwareId ?? null,
          friendlyId: screen.device?.hardwareId ?? null,
          width: params.width,
          height: params.height,
          orientation,
        },
        system: {
          timestampUtc,
          coreVersion,
          firmwareVersion,
          timestamp_utc: timestampUtc,
          core_version: coreVersion,
          firmware_version: firmwareVersion,
        },
      },
      manifest,
      plugin: manifest,
      config: params.configJson ?? {},
      ...params.runtimeData,
      width: params.width,
      height: params.height,
    };
  }
}
