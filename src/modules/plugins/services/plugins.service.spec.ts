import { PrismaService } from '@core/prisma';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PluginImportService } from './plugin-import.service';
import { PluginStorageService } from './plugin-storage.service';
import { PluginsService } from './plugins.service';
import { RegistryClient } from './registry-client.service';

describe('PluginService', () => {
  let service: PluginsService;
  let prisma: {
    plugin: { findMany: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
    pluginInstance: { deleteMany: jest.Mock };
    pluginVersion: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let storage: { getVersionPath: jest.Mock; pathExists: jest.Mock; deletePluginDir: jest.Mock };

  beforeEach(async () => {
    prisma = {
      plugin: { findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      pluginInstance: { deleteMany: jest.fn() },
      pluginVersion: { deleteMany: jest.fn() },
      $transaction: jest.fn((operations: unknown[]) => Promise.resolve(operations)),
    };
    storage = {
      getVersionPath: jest.fn((slug: string, version: string) => `/store/${slug}/${version}`),
      pathExists: jest.fn().mockResolvedValue(false),
      deletePluginDir: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RegistryClient, useValue: { getPlugin: jest.fn(), downloadPluginZip: jest.fn(), baseUrl: '' } },
        { provide: PluginImportService, useValue: { importFromRegistryZip: jest.fn() } },
        { provide: PluginStorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<PluginsService>(PluginsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  function pluginRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      manifestId: 'zenso/test',
      slug: 'zenso__test',
      name: 'Test',
      description: null,
      authorName: null,
      thumbnail: 'assets/logo.png',
      configSchema: null,
      versions: [{ version: '1.0.0', executionMode: 'local', status: 'installed' }],
      ...overrides,
    };
  }

  it('resolves icons, thumbnail and readme only for files present on disk', async () => {
    storage.pathExists.mockImplementation((targetPath: string) => {
      return Promise.resolve(targetPath.endsWith('favicon.ico') || targetPath.endsWith('README.md'));
    });
    prisma.plugin.findMany.mockResolvedValue([pluginRow()]);

    const [response] = await service.getInstalledPlugins();

    expect(response?.icons).toEqual([
      { src: '/plugins/assets/zenso__test/1.0.0/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ]);
    expect(response?.thumbnailUrl).toBeNull();
    expect(response?.readmeUrl).toBe('/plugins/assets/zenso__test/1.0.0/README.md');
  });

  it('returns empty icons and null urls when the plugin has no versions or files', async () => {
    prisma.plugin.findMany.mockResolvedValue([pluginRow({ versions: [] })]);

    const [response] = await service.getInstalledPlugins();

    expect(response?.icons).toEqual([]);
    expect(response?.thumbnailUrl).toBeNull();
    expect(response?.readmeUrl).toBeNull();
    expect(response?.selectedVersion).toBeNull();
  });

  describe('uninstall', () => {
    function pluginWithInstances(instances: Array<{ id: number; screenSlots: Array<{ id: number }> }>) {
      prisma.plugin.findUnique.mockResolvedValue({ id: 1, slug: 'zenso__test', instances });
    }

    it('auto-removes orphan instances and uninstalls when nothing is on a screen', async () => {
      pluginWithInstances([
        { id: 10, screenSlots: [] },
        { id: 11, screenSlots: [] },
      ]);

      const result = await service.uninstall(1);

      expect(prisma.pluginInstance.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [10, 11] } } });
      expect(prisma.pluginVersion.deleteMany).toHaveBeenCalledWith({ where: { pluginId: 1 } });
      expect(prisma.plugin.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(storage.deletePluginDir).toHaveBeenCalledWith('zenso__test');
      expect(result).toEqual({ message: 'Plugin uninstalled', pluginId: 1, deletedInstances: 2 });
    });

    it('uninstalls cleanly with no instances at all', async () => {
      pluginWithInstances([]);

      const result = await service.uninstall(1);

      expect(prisma.pluginInstance.deleteMany).not.toHaveBeenCalled();
      expect(storage.deletePluginDir).toHaveBeenCalledWith('zenso__test');
      expect(result).toEqual({ message: 'Plugin uninstalled', pluginId: 1, deletedInstances: 0 });
    });

    it('still blocks when an instance is assigned to a screen', async () => {
      pluginWithInstances([
        { id: 10, screenSlots: [] },
        { id: 11, screenSlots: [{ id: 5 }] },
      ]);

      await expect(service.uninstall(1)).rejects.toThrow(ConflictException);
      expect(prisma.plugin.delete).not.toHaveBeenCalled();
      expect(storage.deletePluginDir).not.toHaveBeenCalled();
    });
  });
});
