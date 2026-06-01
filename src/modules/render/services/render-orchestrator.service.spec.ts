import { PrismaService } from '@core/prisma';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { EpdImageService } from './epd-image.service';
import { RenderCacheService } from './render-cache.service';
import { RenderOrchestratorService } from './render-orchestrator.service';
import { ScreenComposerService } from './screen-composer.service';
import { ScreenRenderService } from './screen-render.service';

describe('RenderOrchestratorService', () => {
  let service: RenderOrchestratorService;
  let mockPrismaService: {
    screen: {
      findUnique: jest.Mock;
    };
  };
  let mockScreenRenderService: {
    renderSlots: jest.Mock;
  };
  let mockScreenComposerService: {
    compose: jest.Mock;
  };
  let mockRenderCacheService: {
    generateKey: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockEpdImageService: {
    renderPreview: jest.Mock;
    renderForDevice: jest.Mock;
  };

  const mockScreen = {
    id: 1,
    name: 'Test Screen',
    width: 800,
    height: 480,
    palette: ['#000000', '#ffffff'],
    renderMode: 'ui',
    refreshRate: 300,
    isActive: true,
    deviceId: 1,
    userId: 1,
    layoutType: 'full',
    createdAt: new Date(),
    updatedAt: new Date(),
    contentHash: null,
    device: { id: 1 },
    slots: [
      {
        id: 1,
        screenId: 1,
        pluginInstanceId: 5,
        slotKey: 'A',
        x: 0,
        y: 0,
        w: 800,
        h: 480,
        zIndex: 0,
        renderOrder: 0,
        pluginInstance: {
          id: 5,
          configJson: null,
          pluginVersion: null,
        },
      },
    ],
  };

  const mockScreenNoSlots = {
    ...mockScreen,
    slots: [],
  };

  const mockComposedPng = Buffer.from('composed-png');
  const mockPreviewBuffer = Buffer.from('preview-output');
  const mockDeviceBuffer = Buffer.from('device-output');
  const mockCacheKey = 'abc123def456abc123def456abc123de';

  beforeEach(async () => {
    mockPrismaService = {
      screen: {
        findUnique: jest.fn(),
      },
    };

    mockScreenRenderService = {
      renderSlots: jest.fn(),
    };

    mockScreenComposerService = {
      compose: jest.fn().mockResolvedValue(mockComposedPng),
    };

    mockRenderCacheService = {
      generateKey: jest.fn().mockReturnValue(mockCacheKey),
      get: jest.fn().mockReturnValue(null),
      set: jest.fn(),
    };

    mockEpdImageService = {
      renderPreview: jest.fn().mockResolvedValue(mockPreviewBuffer),
      renderForDevice: jest.fn().mockResolvedValue(mockDeviceBuffer),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenderOrchestratorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ScreenRenderService, useValue: mockScreenRenderService },
        { provide: ScreenComposerService, useValue: mockScreenComposerService },
        { provide: RenderCacheService, useValue: mockRenderCacheService },
        { provide: EpdImageService, useValue: mockEpdImageService },
      ],
    }).compile();

    service = module.get<RenderOrchestratorService>(RenderOrchestratorService);
  });

  describe('renderPreview', () => {
    it('returns { buffer, contentKey } where contentKey is a non-empty string', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValueOnce(mockScreen).mockResolvedValueOnce(mockScreen);
      mockScreenRenderService.renderSlots.mockResolvedValue([
        { x: 0, y: 0, w: 800, h: 480, zIndex: 0, pngBuffer: Buffer.from('slot-png') },
      ]);

      const result = await service.renderPreview(1);

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('contentKey');
      expect(result.contentKey).toBe(mockCacheKey);
      expect(result.contentKey.length).toBeGreaterThan(0);
    });

    it('throws NotFoundException for unknown screenId', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(service.renderPreview(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('renderForDevice', () => {
    it('returns { buffer, contentKey }', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValueOnce(mockScreen).mockResolvedValueOnce(mockScreen);
      mockScreenRenderService.renderSlots.mockResolvedValue([
        { x: 0, y: 0, w: 800, h: 480, zIndex: 0, pngBuffer: Buffer.from('slot-png') },
      ]);

      const result = await service.renderForDevice(1);

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('contentKey', mockCacheKey);
    });
  });

  describe('cache behavior', () => {
    it('does not call screenRenderService.renderSlots on second call with same screen', async () => {
      mockPrismaService.screen.findUnique
        .mockResolvedValueOnce(mockScreen)
        .mockResolvedValueOnce(mockScreen)
        .mockResolvedValueOnce(mockScreen)
        .mockResolvedValueOnce(mockScreen);
      mockScreenRenderService.renderSlots.mockResolvedValue([
        { x: 0, y: 0, w: 800, h: 480, zIndex: 0, pngBuffer: Buffer.from('slot-png') },
      ]);

      // First call: cache miss -> should render
      mockRenderCacheService.get.mockReturnValueOnce(null);
      await service.renderPreview(1);

      // Cache set called once
      expect(mockRenderCacheService.set).toHaveBeenCalledTimes(1);
      expect(mockScreenRenderService.renderSlots).toHaveBeenCalledTimes(1);

      // Second call: cache hit -> should NOT render
      mockRenderCacheService.get.mockReturnValueOnce(mockComposedPng);
      jest.clearAllMocks();
      mockRenderCacheService.get.mockReturnValue(mockComposedPng);

      await service.renderPreview(1);

      expect(mockScreenRenderService.renderSlots).not.toHaveBeenCalled();
      expect(mockScreenComposerService.compose).not.toHaveBeenCalled();
      expect(mockRenderCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('screen with no slots', () => {
    it('returns a blank composed image without rendering slots', async () => {
      mockPrismaService.screen.findUnique
        .mockResolvedValueOnce(mockScreenNoSlots)
        .mockResolvedValueOnce(mockScreenNoSlots);

      const result = await service.renderPreview(1);

      expect(mockScreenRenderService.renderSlots).not.toHaveBeenCalled();
      expect(mockScreenComposerService.compose).toHaveBeenCalledWith({
        width: 800,
        height: 480,
        slots: [],
      });
      expect(result.buffer).toBe(mockPreviewBuffer);
    });
  });
});
