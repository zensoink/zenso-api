import { Test, TestingModule } from '@nestjs/testing';

import { PluginImportService } from './plugin-import.service';

describe('PluginImportService', () => {
  let service: PluginImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginImportService],
    }).compile();

    service = module.get<PluginImportService>(PluginImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
