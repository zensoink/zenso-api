import { PrismaService } from '@core/prisma';
import { WidgetsService } from '@modules/widgets/widgets.service';
import { NotFoundException } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DevicesController } from './devices.controller';

describe('DevicesController', () => {
  let controller: DevicesController;
  let mockPrismaService: {
    device: {
      findUnique: jest.Mock;
    };
  };
  let mockWidgetsService: {
    renderWidget: jest.Mock;
  };

  const mockDevice = {
    id: 1,
    uid: 'device-123',
    name: 'Test Device',
    width: 800,
    height: 480,
    palette: ['#000000', '#ffffff', '#ff0000'],
    userId: 1,
    slots: [
      {
        id: 1,
        position: 0,
        x: 0,
        y: 0,
        w: 12,
        h: 12,
        widget: {
          id: 1,
          name: 'Test Widget',
          template: '<div>Hello</div>',
        },
      },
      {
        id: 2,
        position: 1,
        x: 0,
        y: 0,
        w: 12,
        h: 12,
        widget: {
          id: 2,
          name: 'Second Widget',
          template: '<div>World</div>',
        },
      },
    ],
  };

  beforeEach(async () => {
    mockPrismaService = {
      device: {
        findUnique: jest.fn(),
      },
    };

    mockWidgetsService = {
      renderWidget: jest.fn().mockResolvedValue(Buffer.from('mock-image')),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WidgetsService, useValue: mockWidgetsService },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDisplay', () => {
    it('should return widget image for device', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      const result = await controller.getDisplay('device-123');

      expect(mockPrismaService.device.findUnique).toHaveBeenCalledWith({
        where: { uid: 'device-123' },
        include: {
          slots: {
            include: { widget: true },
            orderBy: { position: 'asc' },
          },
        },
      });
      expect(mockWidgetsService.renderWidget).toHaveBeenCalledWith({
        template: '<div>Hello</div>',
        width: 800,
        height: 480,
        data: { deviceName: 'Test Device' },
        palette: ['#000000', '#ffffff', '#ff0000'],
      });
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should return second slot when slot param is provided', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      await controller.getDisplay('device-123', '1');

      expect(mockWidgetsService.renderWidget).toHaveBeenCalledWith({
        template: '<div>World</div>',
        width: 800,
        height: 480,
        data: { deviceName: 'Test Device' },
        palette: ['#000000', '#ffffff', '#ff0000'],
      });
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);

      await expect(controller.getDisplay('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when device has no slots', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        slots: [],
      });

      await expect(controller.getDisplay('device-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when slot index is out of bounds', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      await expect(controller.getDisplay('device-123', '5')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when slot param is invalid', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      await expect(controller.getDisplay('device-123', 'abc')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when slot param is negative', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      await expect(controller.getDisplay('device-123', '-1')).rejects.toThrow(NotFoundException);
    });
  });
});
