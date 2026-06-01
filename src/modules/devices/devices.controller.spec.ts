import { PrismaService } from '@core/prisma';
import { RenderOrchestratorService } from '@modules/render/services/render-orchestrator.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

describe('DevicesController', () => {
  let controller: DevicesController;
  let mockPrismaService: {
    device: {
      findUnique: jest.Mock;
    };
  };
  let mockRenderOrchestratorService: {
    renderPreview: jest.Mock;
    renderForDevice: jest.Mock;
  };
  let mockDevicesService: {
    checkIn: jest.Mock;
  };

  const mockDevice = {
    id: 1,
    uid: 'device-123',
    name: 'Test Device',
    width: 800,
    height: 480,
    palette: ['#000000', '#ffffff', '#ff0000'],
    userId: 1,
    screens: [
      {
        id: 1,
        name: 'Default Screen',
        isActive: true,
      },
    ],
  };

  beforeEach(async () => {
    mockPrismaService = {
      device: {
        findUnique: jest.fn(),
      },
    };

    mockRenderOrchestratorService = {
      renderPreview: jest.fn().mockResolvedValue(Buffer.from('mock-png')),
      renderForDevice: jest.fn().mockResolvedValue(Buffer.from('mock-raw')),
    };

    mockDevicesService = {
      checkIn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RenderOrchestratorService, useValue: mockRenderOrchestratorService },
        { provide: DevicesService, useValue: mockDevicesService },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDisplay', () => {
    it('should return device display via renderPreview when format=png', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      const result = await controller.getDisplay('device-123', 'png');

      expect(mockPrismaService.device.findUnique).toHaveBeenCalledWith({
        where: { uid: 'device-123' },
        include: {
          screens: {
            where: { isActive: true },
            orderBy: { id: 'asc' },
            take: 1,
          },
        },
      });
      expect(mockRenderOrchestratorService.renderPreview).toHaveBeenCalledWith(1);
      expect(mockRenderOrchestratorService.renderForDevice).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should return device display via renderForDevice when format=raw', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      const result = await controller.getDisplay('device-123', 'raw');

      expect(mockRenderOrchestratorService.renderForDevice).toHaveBeenCalledWith(1);
      expect(mockRenderOrchestratorService.renderPreview).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should default to renderForDevice when format is not specified', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      await controller.getDisplay('device-123');

      expect(mockRenderOrchestratorService.renderForDevice).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);

      await expect(controller.getDisplay('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when device has no active screens', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [],
      });

      await expect(controller.getDisplay('device-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when format is invalid', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);

      await expect(controller.getDisplay('device-123', 'bmp')).rejects.toThrow(BadRequestException);
    });
  });
});
