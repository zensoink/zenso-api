import { Test, TestingModule } from '@nestjs/testing';

import { PluginImportService } from '../services/plugin-import.service';
import { PluginImportController } from './plugin-import.controller';

describe('PluginImportController', () => {
  let controller: PluginImportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginImportController],
      providers: [{ provide: PluginImportService, useValue: { importFromZipUpload: jest.fn() } }],
    }).compile();

    controller = module.get<PluginImportController>(PluginImportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
