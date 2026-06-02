import { PrismaService } from '@core/prisma';
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
}

export interface ZensoContext {
  user: ZensoUserContext;
  device: ZensoDeviceContext;
  system: ZensoSystemContext;
}

export interface AggregatedContext {
  zenso: ZensoContext;
  manifest: ZensoManifestContext;
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

    return {
      zenso: {
        user: {
          id: `user_${screen.user.id}`,
          name: screen.user.name ?? null,
          firstName: 'Tytus',
          locale: 'pl-PL',
          language: 'pl',
          timeZoneIana: 'Europe/Warsaw',
          utcOffset: 7200,
        },
        device: {
          id: screen.device?.uid ?? null,
          friendlyId: screen.device?.uid ?? null,
          width: params.width,
          height: params.height,
          orientation,
        },
        system: {
          timestampUtc: Math.floor(Date.now() / 1000),
          coreVersion: process.env.npm_package_version ?? '0.0.0',
          firmwareVersion: '0.0.0',
        },
      },
      manifest: {
        id: z
          .string()
          .nullable()
          .parse(params.manifestJson ?? null),
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
      },
      config: params.configJson ?? {},
      ...params.runtimeData,
      width: params.width,
      height: params.height,
    };
  }
}
