import { PrismaService } from '@core/prisma';
import { Test, TestingModule } from '@nestjs/testing';

import { PluginImportService } from './plugin-import.service';
import { PluginsService } from './plugins.service';
import { RegistryClient } from './registry-client.service';

describe('PluginService', () => {
  let service: PluginsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginsService,
        { provide: PrismaService, useValue: { plugin: { findMany: jest.fn() }, $transaction: jest.fn() } },
        { provide: RegistryClient, useValue: { getPlugin: jest.fn(), downloadPluginZip: jest.fn(), baseUrl: '' } },
        { provide: PluginImportService, useValue: { importFromRegistryZip: jest.fn() } },
      ],
    }).compile();

    service = module.get<PluginsService>(PluginsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
