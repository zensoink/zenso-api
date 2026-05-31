import { PrismaService } from '@core/prisma';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DevicesService } from './devices.service';
import { DeviceCheckInDto } from './dto/device-check-in.dto';

describe('DevicesService', () => {
  let service: DevicesService;
  let mockPrismaService: {
    device: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const mockDevice = {
    id: 1,
    uid: 'device-123',
    name: 'Test Device',
    width: 800,
    height: 480,
    palette: ['#000000', '#ffffff'],
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: null,
    firmwareVersion: null,
  };

  const mockScreen = {
    id: 10,
    name: 'Default Screen',
    isActive: true,
    palette: ['#111111', '#222222'],
    renderMode: 'bw',
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
      },
    ],
  };

  beforeEach(async () => {
    mockPrismaService = {
      device: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DevicesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIn', () => {
    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);

      await expect(service.checkIn('non-existent', {})).rejects.toThrow(NotFoundException);
    });

    it('should update lastSeenAt on every call', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({ ...mockDevice, screens: [] });

      await service.checkIn('device-123', {});

      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { uid: 'device-123' },
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        data: expect.objectContaining({
          lastSeenAt: expect.any(Date),
        }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      });
    });

    it('should update firmwareVersion when provided in DTO', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({ ...mockDevice, screens: [] });
      const dto: DeviceCheckInDto = { firmwareVersion: '2.0.0' };

      await service.checkIn('device-123', dto);

      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { uid: 'device-123' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          firmwareVersion: '2.0.0',
        }),
      });
    });

    it('should not overwrite firmwareVersion when not provided in DTO', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({ ...mockDevice, screens: [] });

      await service.checkIn('device-123', {});

      expect(mockPrismaService.device.update).toHaveBeenCalledWith({
        where: { uid: 'device-123' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.not.objectContaining({ firmwareVersion: expect.anything() }),
      });
    });

    it('should return hasImage: false when screen has no slots', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [{ ...mockScreen, slots: [] }],
      });

      const result = await service.checkIn('device-123', {});

      expect(result.hasImage).toBe(false);
    });

    it('should return hasImage: true when screen has at least one slot', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [mockScreen],
      });

      const result = await service.checkIn('device-123', {});

      expect(result.hasImage).toBe(true);
    });

    it('should return imageUrl: null when device has no active screen', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [],
      });

      const result = await service.checkIn('device-123', {});

      expect(result.imageUrl).toBeNull();
    });

    it('should return correct imageUrl when screen exists', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [mockScreen],
      });

      const result = await service.checkIn('device-123', {});

      expect(result.imageUrl).toBe('/devices/device-123/display');
    });

    it('should use screen palette when screen exists', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [mockScreen],
      });

      const result = await service.checkIn('device-123', {});

      expect(result.palette).toEqual(['#111111', '#222222']);
    });

    it('should fall back to device palette when no screen', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [],
      });

      const result = await service.checkIn('device-123', {});

      expect(result.palette).toEqual(['#000000', '#ffffff']);
    });
  });
});
