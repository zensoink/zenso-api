import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RenderEngineService } from './services/render-engine.service';
import { WidgetsService } from './widgets.service';

jest.mock('puppeteer', () => ({
  default: {
    launch: jest.fn(() =>
      Promise.resolve({
        newPage: jest.fn(() =>
          Promise.resolve({
            setViewport: jest.fn(() => Promise.resolve()),
            setContent: jest.fn(() => Promise.resolve()),
            screenshot: jest.fn(() => Promise.resolve(Buffer.from('mock-screenshot'))),
            close: jest.fn(() => Promise.resolve()),
          })
        ),
        close: jest.fn(() => Promise.resolve()),
      })
    ),
  },
}));

describe('WidgetsService', () => {
  let service: WidgetsService;
  let mockRenderEngineService: {
    renderWidget: jest.Mock;
  };

  beforeEach(async () => {
    mockRenderEngineService = {
      renderWidget: jest.fn().mockResolvedValue(Buffer.from('mock-image')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WidgetsService, { provide: RenderEngineService, useValue: mockRenderEngineService }],
    }).compile();

    service = module.get<WidgetsService>(WidgetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('renderWidget validation', () => {
    it('should throw BadRequestException when template is missing', async () => {
      await expect(
        service.renderWidget({
          template: '',
          width: 800,
          height: 480,
          data: {},
          palette: ['#000000', '#ffffff'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when template is not a string', async () => {
      await expect(
        service.renderWidget({
          template: null as unknown as string,
          width: 800,
          height: 480,
          data: {},
          palette: ['#000000', '#ffffff'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when width is invalid', async () => {
      await expect(
        service.renderWidget({
          template: '<div>Test</div>',
          width: 0,
          height: 480,
          data: {},
          palette: ['#000000', '#ffffff'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when width exceeds maximum', async () => {
      await expect(
        service.renderWidget({
          template: '<div>Test</div>',
          width: 5000,
          height: 480,
          data: {},
          palette: ['#000000', '#ffffff'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when height is invalid', async () => {
      await expect(
        service.renderWidget({
          template: '<div>Test</div>',
          width: 800,
          height: -1,
          data: {},
          palette: ['#000000', '#ffffff'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when palette has less than 2 colors', async () => {
      await expect(
        service.renderWidget({
          template: '<div>Test</div>',
          width: 800,
          height: 480,
          data: {},
          palette: ['#000000'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when palette is not an array', async () => {
      await expect(
        service.renderWidget({
          template: '<div>Test</div>',
          width: 800,
          height: 480,
          data: {},
          palette: null as unknown as string[],
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
