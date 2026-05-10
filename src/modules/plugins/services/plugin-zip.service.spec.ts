import { Test, TestingModule } from '@nestjs/testing';

import { PluginZipService } from './plugin-zip.service';

describe('PluginZipService', () => {
  let service: PluginZipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginZipService],
    }).compile();

    service = module.get<PluginZipService>(PluginZipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
