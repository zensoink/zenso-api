import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PluginStorageService } from './plugin-storage.service';

describe('PluginsService', () => {
  let service: PluginStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginStorageService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('/tmp/plugins') } },
      ],
    }).compile();

    service = module.get<PluginStorageService>(PluginStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
