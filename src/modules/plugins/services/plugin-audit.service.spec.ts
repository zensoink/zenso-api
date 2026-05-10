import { Test, TestingModule } from '@nestjs/testing';

import { PluginAuditService } from './plugin-audit.service';

describe('PluginAuditService', () => {
  let service: PluginAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginAuditService],
    }).compile();

    service = module.get<PluginAuditService>(PluginAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
