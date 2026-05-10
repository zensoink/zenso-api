import { Test, TestingModule } from '@nestjs/testing';

import { PluginImportController } from './plugin-import.controller';

describe('PluginImportController', () => {
  let controller: PluginImportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginImportController],
    }).compile();

    controller = module.get<PluginImportController>(PluginImportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
