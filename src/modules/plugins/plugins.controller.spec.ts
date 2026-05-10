import { Test, TestingModule } from '@nestjs/testing';

import { PluginsController } from './plugins.controller';

describe('PluginController', () => {
  let controller: PluginsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginsController],
    }).compile();

    controller = module.get<PluginsController>(PluginsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
