import { createHash } from 'node:crypto';

import { PrismaService } from '@core/prisma';
import { RenderCacheService } from '@modules/render';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceClaimStatus, DeviceStatus } from '@prisma/client';

import { DevicesService } from './devices.service';
import { DeviceCheckInDto } from './dto/device-check-in.dto';

describe('DevicesService', () => {
  let service: DevicesService;
  let mockPrismaService: {
    device: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    screen: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    claimSession: {
      deleteMany: jest.Mock;
    };
  };
  let mockRenderCacheService: {
    generateKey: jest.Mock;
    get: jest.Mock;
    invalidateScreen: jest.Mock;
  };

  const mockDevice = {
    id: 1,
    hardwareId: 'E072A1F93108',
    name: 'Test Device',
    status: DeviceStatus.active,
    width: 800,
    height: 480,
    palette: ['#000000', '#ffffff'],
    displayProfile: 'spectra6_7in3',
    epdConfig: null,
    refreshRate: 300,
    rotation: 0,
    palettePreset: 'full',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: null,
    firmwareVersion: null,
    deviceSecretHash: '$2b$10$somehash',
    deviceTokenVersion: 1,
    revokedAt: null,
    claimStatus: DeviceClaimStatus.claimed,
    claimedAt: null,
    lastBootstrapAt: null,
  };

  const mockScreen = {
    id: 10,
    name: 'Default Screen',
    isActive: true,
    width: 800,
    height: 480,
    refreshRate: 600,
    contentHash: null,
    palette: ['#111111', '#222222'],
    renderMode: 'ui',
    slots: [
      {
        id: 1,
        screenId: 10,
        pluginInstanceId: 5,
        slotKey: 'main',
        x: 0,
        y: 0,
        w: 800,
        h: 480,
        zIndex: 0,
        renderOrder: 0,
        pluginInstance: {
          configJson: null,
          pluginVersion: null,
        },
      },
    ],
  };

  beforeEach(async () => {
    mockPrismaService = {
      device: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      screen: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      claimSession: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockRenderCacheService = {
      generateKey: jest.fn().mockReturnValue('test-content-key'),
      get: jest.fn().mockReturnValue(null),
      invalidateScreen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RenderCacheService, useValue: mockRenderCacheService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('should update device properties and return updated device', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.device.update.mockResolvedValue({
        ...mockDevice,
        name: 'Updated Device',
        displayProfile: 'bwr_4in2',
        palettePreset: 'mono',
        palette: ['#000000', '#ffffff'],
      });
      mockPrismaService.screen.findMany.mockResolvedValue([{ id: 10 }]);

      const result = await service.update(1, 1, {
        name: 'Updated Device',
        displayProfile: 'bwr_4in2',
        palettePreset: 'mono',
        palette: ['#000000', '#ffffff'],
      });

      expect(mockPrismaService.device.update).toHaveBeenCalled();
      expect(mockRenderCacheService.invalidateScreen).toHaveBeenCalledWith(10);
      expect(mockPrismaService.screen.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 1 },
        data: { contentHash: null },
      });
      expect(result.name).toBe('Updated Device');
    });

    it('should throw NotFoundException when device does not exist', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(null);

      await expect(service.update(999, 1, { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('should soft-unclaim device, unlink screens, and increment token version by default', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.screen.findMany.mockResolvedValue([{ id: 10 }]);
      mockPrismaService.device.update.mockResolvedValue({
        ...mockDevice,
        status: DeviceStatus.inactive,
        claimStatus: DeviceClaimStatus.pending,
      });

      const result = await service.revoke(1, 1, false);

      expect(mockRenderCacheService.invalidateScreen).toHaveBeenCalledWith(10);
      expect(mockPrismaService.screen.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 1 },
        data: { deviceId: null, contentHash: null },
      });
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(mockPrismaService.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            status: DeviceStatus.inactive,
            claimStatus: DeviceClaimStatus.pending,
            deviceTokenVersion: { increment: 1 },
          }),
        })
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(result.hardDeleted).toBe(false);
    });

    it('should hard delete device and claim sessions when hard is true', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.screen.findMany.mockResolvedValue([{ id: 10 }]);

      const result = await service.revoke(1, 1, true);

      expect(mockRenderCacheService.invalidateScreen).toHaveBeenCalledWith(10);
      expect(mockPrismaService.screen.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 1 },
        data: { deviceId: null, contentHash: null },
      });
      expect(mockPrismaService.claimSession.deleteMany).toHaveBeenCalledWith({
        where: { deviceId: 1 },
      });
      expect(mockPrismaService.device.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.hardDeleted).toBe(true);
    });

    it('should throw NotFoundException when revoking non-existent device', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(null);

      await expect(service.revoke(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('forceRefresh', () => {
    it('should invalidate cache for linked screens and reset contentHash', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.screen.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);

      const result = await service.forceRefresh(1, 1);

      expect(mockRenderCacheService.invalidateScreen).toHaveBeenCalledWith(10);
      expect(mockRenderCacheService.invalidateScreen).toHaveBeenCalledWith(11);
      expect(mockPrismaService.screen.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 1 },
        data: { contentHash: null },
      });
      expect(result.deviceId).toBe(1);
      expect(result.invalidatedScreensCount).toBe(2);
      expect(result.refreshedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when force-refreshing non-existent device', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(null);

      await expect(service.forceRefresh(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkIn', () => {
    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);

      await expect(service.checkIn(999, {})).rejects.toThrow(NotFoundException);
    });

    it('should update lastSeenAt on every call', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({ ...mockDevice, screens: [] });

      await service.checkIn(1, {});

      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { id: 1 },
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data: expect.objectContaining({
          lastSeenAt: expect.any(Date),
          status: DeviceStatus.active,
        }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      });
    });

    it('should update firmwareVersion when provided in DTO', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({ ...mockDevice, screens: [] });
      const dto: DeviceCheckInDto = { firmwareVersion: '2.0.0' };

      await service.checkIn(1, dto);

      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { id: 1 },
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data: expect.objectContaining({
          firmwareVersion: '2.0.0',
        }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      });
    });

    it('should not overwrite firmwareVersion when not provided in DTO', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({ ...mockDevice, screens: [] });

      await service.checkIn(1, {});

      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { id: 1 },
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data: expect.not.objectContaining({ firmwareVersion: expect.anything() }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      });
    });

    it('should return hasImage: false when screen has no slots', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [{ ...mockScreen, slots: [] }],
      });

      const result = await service.checkIn(1, {});

      expect(result.hasImage).toBe(false);
    });

    it('should return hasImage: true when screen has at least one slot', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [mockScreen],
      });

      const result = await service.checkIn(1, {});

      expect(result.hasImage).toBe(true);
    });

    it('should return imageUrl: null when device has no active screen', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [],
      });

      const result = await service.checkIn(1, {});

      expect(result.imageUrl).toBeNull();
    });

    it('should return correct imageUrl when screen exists', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [mockScreen],
      });

      const result = await service.checkIn(1, {});

      expect(result.imageUrl).toBe('/devices/display');
    });

    it('should return authoritative device palette and refreshRate', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        refreshRate: 300,
        palette: ['#000000', '#ffffff'],
        screens: [mockScreen],
      });

      const result = await service.checkIn(1, {});

      expect(result.palette).toEqual(['#000000', '#ffffff']);
      expect(result.refreshRate).toBe(300);
      expect(result.displayProfile).toBe('spectra6_7in3');
      expect(result.rotation).toBe(0);
    });

    it('should return contentChanged: true when the render cache expired (stale)', async () => {
      const served = Buffer.from('served-png');
      mockRenderCacheService.get.mockReturnValue(null);
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [{ ...mockScreen, contentHash: createHash('sha256').update(served).digest('hex') }],
      });

      const result = await service.checkIn(1, {});

      expect(result.contentChanged).toBe(true);
    });

    it('should return contentChanged: true when the cached PNG differs from contentHash', async () => {
      mockRenderCacheService.get.mockReturnValue(Buffer.from('fresh-png'));
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [{ ...mockScreen, contentHash: 'old-hash' }],
      });

      const result = await service.checkIn(1, {});

      expect(result.contentChanged).toBe(true);
    });

    it('should return contentChanged: false when the cached PNG matches contentHash', async () => {
      const cached = Buffer.from('current-png');
      mockRenderCacheService.get.mockReturnValue(cached);
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [{ ...mockScreen, contentHash: createHash('sha256').update(cached).digest('hex') }],
      });

      const result = await service.checkIn(1, {});

      expect(result.contentChanged).toBe(false);
    });
  });

  describe('rotateSecret', () => {
    it('should rotate secret and increment token version', async () => {
      mockPrismaService.device.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.device.update.mockResolvedValue({ ...mockDevice, deviceTokenVersion: 2 });

      const result = await service.rotateSecret(1, 1);

      expect(mockPrismaService.device.findFirst).toHaveBeenCalledWith({ where: { id: 1, userId: 1 } });
      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { id: 1 },
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data: expect.objectContaining({
          deviceSecretHash: expect.any(String),
          deviceTokenVersion: { increment: 1 },
        }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      });
      expect(result.id).toBe(1);
      expect(result.rawSecret).toBeDefined();
    });
  });
});
