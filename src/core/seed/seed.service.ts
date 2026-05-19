import { PluginImportService } from '@modules/plugins/services/plugin-import.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginImportService: PluginImportService,
    private readonly configService: ConfigService
  ) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_ON_STARTUP === 'false') {
      this.logger.log('🔧 Seeding disabled via SEED_ON_STARTUP=false');
      return;
    }

    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      this.logger.log('🔧 Database already seeded, skipping.');
      return;
    }

    this.logger.log('🔧 Database empty — seeding...');
    await this.seed();
    this.logger.log('🔧 Database seeded successfully');
  }

  private async seed() {
    const user = await this.prisma.user.create({
      data: { name: 'Demo User', email: 'demo@zenso.local' },
    });

    const plugin = await this.downloadAndImportPlugin();

    const widget = await this.prisma.widget.create({
      data: {
        name: 'Hello World Widget',
        template: '<h1>Hello, World!</h1><p>Welcome to Zenso API.</p>',
        userId: user.id,
      },
    });

    const device = await this.prisma.device.create({
      data: {
        name: 'Demo Device',
        uid: 'demo-device-001',
        width: 800,
        height: 480,
        userId: user.id,
      },
    });

    await this.prisma.deviceWidget.create({
      data: {
        deviceId: device.id,
        widgetId: widget.id,
        position: 0,
        x: 0,
        y: 0,
        w: 12,
        h: 12,
      },
    });

    const dbPlugin = await this.prisma.plugin.findUniqueOrThrow({
      where: { manifestId: plugin.pluginId },
    });

    const instance = await this.prisma.pluginInstance.create({
      data: {
        pluginId: dbPlugin.id,
        name: 'My Zenso Plugin',
        userId: user.id,
        isEnabled: true,
      },
    });

    const screen = await this.prisma.screen.create({
      data: {
        name: 'Default Screen',
        userId: user.id,
        deviceId: device.id,
        layoutType: 'full',
        isActive: true,
      },
    });

    await this.prisma.screenSlot.create({
      data: {
        screenId: screen.id,
        pluginInstanceId: instance.id,
        slotKey: 'A',
        x: 0,
        y: 0,
        w: 800,
        h: 480,
        renderOrder: 0,
      },
    });
  }

  private async downloadAndImportPlugin() {
    const url = this.configService.get<string>('seed.pluginUrl')!;

    this.logger.log(`📥 Downloading plugin from ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`📥 Failed to download plugin: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);
    this.logger.log(`📥 Downloaded ${zipBuffer.length} bytes`);

    const result = await this.pluginImportService.importFromRegistryZip(
      zipBuffer,
      'zenso/plugin-template',
      '0.0.0',
      url
    );

    this.logger.log(`Plugin imported: ${result.slug}@${result.version}`);
    return result;
  }
}
