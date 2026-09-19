import { createHash } from 'node:crypto';

import { PrismaService } from '@core/prisma';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    device: {
      id: 1,
      width: 800,
      height: 480,
      palette: ['#000000', '#ffffff'],
      rotation: 0,
      displayProfile: 'spectra6_7in3',
      refreshRate: 300,
      epdConfig: null,
    },
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
      renderForDevice: jest.fn().mockResolvedValue(Buffer.from('device-raw')),
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
    it('returns { buffer, contentKey } where contentKey is the PNG hash', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockScreenRenderService.renderSlots.mockResolvedValue([
        { x: 0, y: 0, w: 800, h: 480, zIndex: 0, pngBuffer: Buffer.from('slot-png') },
      ]);

      const result = await service.renderPreview(1);

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(mockScreenComposerService.compose).toHaveBeenCalledWith({
        width: 800,
        height: 480,
        slots: expect.any(Array),
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      expect(mockEpdImageService.renderPreview).toHaveBeenCalledWith({
        input: mockComposedPng,
        width: 800,
        height: 480,
        palette: ['#000000', '#ffffff'],
        mode: 'ui',
        rotation: 0,
        displayProfile: 'spectra6_7in3',
        epdConfig: null,
      });

      expect(result.buffer).toBe(mockPreviewBuffer);
      expect(result.contentKey).toBe(createHash('sha256').update(mockComposedPng).digest('hex'));
    });

    it('throws NotFoundException for unknown screenId', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(service.renderPreview(999)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when screen has no assigned device', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue({
        ...mockScreen,
        deviceId: null,
        device: null,
      });

      await expect(service.renderPreview(1)).rejects.toThrow(BadRequestException);
    });

    it('swaps width and height for slot composition when device rotation is 90 or 270', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue({
        ...mockScreen,
        device: {
          ...mockScreen.device,
          rotation: 90,
        },
      });
      mockScreenRenderService.renderSlots.mockResolvedValue([
        { x: 0, y: 0, w: 480, h: 800, zIndex: 0, pngBuffer: Buffer.from('slot-png') },
      ]);

      await service.renderPreview(1);

      // Composed at swapped dimensions: 480 × 800
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(mockScreenComposerService.compose).toHaveBeenCalledWith({
        width: 480,
        height: 800,
        slots: expect.any(Array),
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      // Target output still physical dimensions: 800 × 480 with rotation: 90
      expect(mockEpdImageService.renderPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 800,
          height: 480,
          rotation: 90,
        })
      );
    });
  });

  describe('cache behavior', () => {
    it('preview always re-renders and never reads the cache', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockScreenRenderService.renderSlots.mockResolvedValue([
        { x: 0, y: 0, w: 800, h: 480, zIndex: 0, pngBuffer: Buffer.from('slot-png') },
      ]);

      await service.renderPreview(1);
      await service.renderPreview(1);

      expect(mockRenderCacheService.get).not.toHaveBeenCalled();
      expect(mockScreenRenderService.renderSlots).toHaveBeenCalledTimes(2);
      expect(mockRenderCacheService.set).toHaveBeenCalledTimes(2);
      expect(mockRenderCacheService.set).toHaveBeenCalledWith(
        mockCacheKey,
        mockComposedPng,
        mockScreen.device.refreshRate * 1000,
        mockScreen.id
      );
    });

    it('renderForDevice serves a cache hit without re-rendering slots', async () => {
      const cached = Buffer.from('cached-png');
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockRenderCacheService.get.mockReturnValue(cached);

      const result = await service.renderForDevice(1);

      expect(mockScreenRenderService.renderSlots).not.toHaveBeenCalled();
      expect(mockScreenComposerService.compose).not.toHaveBeenCalled();
      expect(mockRenderCacheService.set).not.toHaveBeenCalled();
      expect(result.contentKey).toBe(createHash('sha256').update(cached).digest('hex'));
    });

    it('renderForDevice re-renders after the refreshRate TTL expires (cache miss)', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockRenderCacheService.get.mockReturnValue(null);
      mockScreenRenderService.renderSlots.mockResolvedValue([
        { x: 0, y: 0, w: 800, h: 480, zIndex: 0, pngBuffer: Buffer.from('slot-png') },
      ]);

      await service.renderForDevice(1);

      expect(mockScreenRenderService.renderSlots).toHaveBeenCalledTimes(1);
      expect(mockRenderCacheService.set).toHaveBeenCalledWith(
        mockCacheKey,
        mockComposedPng,
        mockScreen.device.refreshRate * 1000,
        mockScreen.id
      );
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
