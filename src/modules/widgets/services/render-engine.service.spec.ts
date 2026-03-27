import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getWidgetTemplate, RenderEngineService } from './render-engine.service';

describe('RenderEngineService', () => {
  let service: RenderEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RenderEngineService],
    }).compile();

    service = module.get<RenderEngineService>(RenderEngineService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('renderWidget', () => {
    it('should render widget and return raw buffer', async () => {
      const result = await service.renderWidget({
        template: '<div>Test</div>',
        width: 8,
        height: 8,
        data: {},
        palette: ['#000000', '#ffffff'],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should render widget with data binding', async () => {
      const result = await service.renderWidget({
        template: '<div>{{ name }}</div>',
        width: 8,
        height: 8,
        data: { name: 'Hello' },
        palette: ['#000000', '#ffffff'],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should respect mode parameter', async () => {
      const resultPhoto = await service.renderWidget({
        template: '<div>Test</div>',
        width: 8,
        height: 8,
        data: {},
        palette: ['#000000', '#ffffff'],
        mode: 'photo',
      });

      const resultUI = await service.renderWidget({
        template: '<div>Test</div>',
        width: 8,
        height: 8,
        data: {},
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
      });

      expect(resultPhoto).toBeInstanceOf(Buffer);
      expect(resultUI).toBeInstanceOf(Buffer);
    });

    it('should return png when outputFormat is png', async () => {
      const result = await service.renderWidget({
        template: '<div>Test</div>',
        width: 8,
        height: 8,
        data: {},
        palette: ['#000000', '#ffffff'],
        outputFormat: 'png',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use default outputFormat raw', async () => {
      const result = await service.renderWidget({
        template: '<div>Test</div>',
        width: 8,
        height: 8,
        data: {},
        palette: ['#000000', '#ffffff'],
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw on invalid palette color', async () => {
      await expect(
        service.renderWidget({
          template: '<div>Test</div>',
          width: 8,
          height: 8,
          data: {},
          palette: ['#000000', 'invalid'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should work with multi-color palette', async () => {
      const result = await service.renderWidget({
        template: '<div>Test</div>',
        width: 8,
        height: 8,
        data: {},
        palette: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty data object', async () => {
      const result = await service.renderWidget({
        template: '<div>Static</div>',
        width: 8,
        height: 8,
        data: {},
        palette: ['#000000', '#ffffff'],
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle data with multiple properties', async () => {
      const result = await service.renderWidget({
        template: '<div>{{ name }} - {{ status }}</div>',
        width: 8,
        height: 8,
        data: { name: 'Test', status: 'Active', count: 5 },
        palette: ['#000000', '#ffffff'],
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('getWidgetTemplate', () => {
    it('should generate valid HTML template', () => {
      const result = getWidgetTemplate('<div>Content</div>', { width: 800, height: 480 });

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html lang="pl">');
      expect(result).toContain('<div>Content</div>');
      expect(result).toContain('width: 800px');
      expect(result).toContain('height: 480px');
    });

    it('should include Tailwind CSS', () => {
      const result = getWidgetTemplate('<div>Test</div>', { width: 100, height: 100 });

      expect(result).toContain('cdn.tailwindcss.com');
    });

    it('should set white background', () => {
      const result = getWidgetTemplate('<div>Test</div>', { width: 100, height: 100 });

      expect(result).toContain('background: #ffffff');
    });

    it('should include charset meta tag', () => {
      const result = getWidgetTemplate('<div>Test</div>', { width: 100, height: 100 });

      expect(result).toContain('charset="UTF-8"');
    });

    it('should set overflow hidden', () => {
      const result = getWidgetTemplate('<div>Test</div>', { width: 100, height: 100 });

      expect(result).toContain('overflow: hidden');
    });
  });

  describe('lifecycle', () => {
    it('should have onModuleInit', () => {
      expect(typeof service.onModuleInit).toBe('function');
    });
    it('should have onModuleDestroy', () => {
      expect(typeof service.onModuleDestroy).toBe('function');
    });
  });
});
