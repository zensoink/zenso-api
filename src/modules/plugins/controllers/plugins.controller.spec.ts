import { Test, TestingModule } from '@nestjs/testing';

import { PluginsService } from '../services/plugins.service';
import { RegistryClient } from '../services/registry-client.service';
import { PluginsController } from './plugins.controller';

describe('PluginController', () => {
  let controller: PluginsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginsController],
      providers: [
        { provide: PluginsService, useValue: { installFromRegistry: jest.fn(), getInstalledPlugins: jest.fn() } },
        {
          provide: RegistryClient,
          useValue: { getCatalog: jest.fn(), getPlugin: jest.fn(), getPluginVersions: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<PluginsController>(PluginsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
