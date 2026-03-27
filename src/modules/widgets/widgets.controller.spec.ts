import { Test, TestingModule } from '@nestjs/testing';

import { WidgetsController } from './widgets.controller';
import { WidgetsService } from './widgets.service';

describe('WidgetsController', () => {
  let controller: WidgetsController;

  beforeEach(async () => {
    const mockWidgetsService = {
      renderWidget: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WidgetsController],
      providers: [{ provide: WidgetsService, useValue: mockWidgetsService }],
    }).compile();

    controller = module.get<WidgetsController>(WidgetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
