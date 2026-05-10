import { Test, TestingModule } from '@nestjs/testing';

import { PluginValidatorService } from './plugin-validator.service';

describe('PluginValidatorService', () => {
  let service: PluginValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginValidatorService],
    }).compile();

    service = module.get<PluginValidatorService>(PluginValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
