import { Test, TestingModule } from '@nestjs/testing';

import { PluginStorageService } from './plugin-storage.service';

describe('PluginsService', () => {
  let service: PluginStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginStorageService],
    }).compile();

    service = module.get<PluginStorageService>(PluginStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
