import { PrismaService } from '@core/prisma';
import { RenderOrchestratorService } from '@modules/render/services/render-orchestrator.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

const MOCK_PNG_KEY = 'abc123def456abc123def456abc123de';
const MOCK_RAW_KEY = 'def789ghi012def789ghi012def789gh';

function mockExpressResponse() {
  return {
    set: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

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
        updatedAt: new Date('2026-01-15T10:00:00Z'),
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
      renderPreview: jest.fn().mockResolvedValue({ buffer: Buffer.from('mock-png'), contentKey: MOCK_PNG_KEY }),
      renderForDevice: jest.fn().mockResolvedValue({ buffer: Buffer.from('mock-raw'), contentKey: MOCK_RAW_KEY }),
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
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, 'png', undefined);

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
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should return device display via renderForDevice when format=raw', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, 'raw', undefined);

      expect(mockRenderOrchestratorService.renderForDevice).toHaveBeenCalledWith(1);
      expect(mockRenderOrchestratorService.renderPreview).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it('should default to renderForDevice when format is not specified', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, undefined, undefined);

      expect(mockRenderOrchestratorService.renderForDevice).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);
      const res = mockExpressResponse();

      await expect(controller.getDisplay('non-existent', res as never, undefined, undefined)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException when device has no active screens', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [],
      });
      const res = mockExpressResponse();

      await expect(controller.getDisplay('device-123', res as never, undefined, undefined)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when format is invalid', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await expect(controller.getDisplay('device-123', res as never, 'bmp', undefined)).rejects.toThrow(
        BadRequestException
      );
    });

    // --- ETag / caching test cases ---

    it('should return 200 with buffer when If-None-Match is not present', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, undefined, undefined);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should return ETag header derived from contentKey in 200 response', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, 'png', undefined);

      expect(res.set).toHaveBeenCalledWith('ETag', '"' + MOCK_PNG_KEY.slice(0, 32) + '"');
    });

    it('should return Last-Modified header matching screen.updatedAt', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, 'png', undefined);

      const expected = mockDevice.screens[0].updatedAt.toUTCString();
      expect(res.set).toHaveBeenCalledWith('Last-Modified', expected);
    });

    it('should return same Last-Modified on consecutive requests with same content', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res1 = mockExpressResponse();
      const res2 = mockExpressResponse();

      await controller.getDisplay('device-123', res1 as never, 'png', undefined);
      await controller.getDisplay('device-123', res2 as never, 'png', undefined);

      const expected = mockDevice.screens[0].updatedAt.toUTCString();
      expect(res1.set).toHaveBeenCalledWith('Last-Modified', expected);
      expect(res2.set).toHaveBeenCalledWith('Last-Modified', expected);
    });

    it('should return 304 with no body when If-None-Match matches current ETag', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const etag = '"' + MOCK_PNG_KEY.slice(0, 32) + '"';

      await controller.getDisplay('device-123', res as never, 'png', etag);

      expect(res.status).toHaveBeenCalledWith(304);
      expect(res.end).toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should return 200 when If-None-Match does not match current ETag', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, 'png', '"non-matching-etag"');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should include ETag header in 304 response', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const etag = '"' + MOCK_PNG_KEY.slice(0, 32) + '"';

      await controller.getDisplay('device-123', res as never, 'png', etag);

      expect(res.set).toHaveBeenCalledWith('ETag', etag);
      expect(res.status).toHaveBeenCalledWith(304);
    });

    it('should set Content-Type to image/png when format=png', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, 'png', undefined);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png');
    });

    it('should set Content-Type to application/octet-stream when format=raw', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, 'raw', undefined);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });

    it('should set Content-Type to application/octet-stream when no format param', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();

      await controller.getDisplay('device-123', res as never, undefined, undefined);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });
  });
});
