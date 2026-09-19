import { PrismaService } from '@core/prisma';
import { DeviceJwtAuthGuard, UserJwtAuthGuard } from '@modules/auth';
import { RenderOrchestratorService } from '@modules/render';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

const MOCK_PNG_KEY = 'abc123def456abc123def456abc123de';
const MOCK_RAW_KEY = 'def789ghi012def789ghi012def789gh';
const MOCK_DEVICE_ID = 1;

function mockExpressResponse() {
  return {
    set: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

function mockDeviceRequest(deviceId = MOCK_DEVICE_ID) {
  return { user: { deviceId } };
}

describe('DevicesController', () => {
  let controller: DevicesController;
  let mockPrismaService: {
    device: {
      findUnique: jest.Mock;
    };
    screen: {
      update: jest.Mock;
    };
  };
  let mockRenderOrchestratorService: {
    renderPreview: jest.Mock;
    renderForDevice: jest.Mock;
  };
  let mockDevicesService: {
    checkIn: jest.Mock;
    rotateSecret: jest.Mock;
    update: jest.Mock;
    revoke: jest.Mock;
    forceRefresh: jest.Mock;
  };

  const mockDevice = {
    id: 1,
    hardwareId: 'E072A1F93108',
    name: 'Test Device',
    width: 800,
    height: 480,
    palette: ['#000000', '#ffffff', '#ff0000'],
    rotation: 0,
    displayProfile: 'spectra6_7in3',
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
      screen: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockRenderOrchestratorService = {
      renderPreview: jest.fn().mockResolvedValue({ buffer: Buffer.from('mock-png'), contentKey: MOCK_PNG_KEY }),
      renderForDevice: jest.fn().mockResolvedValue({ buffer: Buffer.from('mock-raw'), contentKey: MOCK_RAW_KEY }),
    };

    mockDevicesService = {
      checkIn: jest.fn(),
      rotateSecret: jest.fn(),
      update: jest.fn(),
      revoke: jest.fn(),
      forceRefresh: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RenderOrchestratorService, useValue: mockRenderOrchestratorService },
        { provide: DevicesService, useValue: mockDevicesService },
      ],
    })
      .overrideGuard(DeviceJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DevicesController>(DevicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDisplay', () => {
    it('should return device display via renderPreview when format=png', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'png', undefined);

      expect(mockPrismaService.device.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_DEVICE_ID },
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
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'raw', undefined);

      expect(mockRenderOrchestratorService.renderForDevice).toHaveBeenCalledWith(1);
      expect(mockRenderOrchestratorService.renderPreview).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it('should default to renderForDevice when format is not specified', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, undefined, undefined);

      expect(mockRenderOrchestratorService.renderForDevice).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await expect(controller.getDisplay(req as never, res as never, undefined, undefined)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException when device has no active screens', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        screens: [],
      });
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await expect(controller.getDisplay(req as never, res as never, undefined, undefined)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when format is invalid', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await expect(controller.getDisplay(req as never, res as never, 'bmp', undefined)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return 200 with buffer when If-None-Match is not present', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, undefined, undefined);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should return ETag header derived from contentKey in 200 response', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'png', undefined);

      expect(res.set).toHaveBeenCalledWith('ETag', '"' + MOCK_PNG_KEY.slice(0, 32) + '"');
    });

    it('should return Last-Modified header matching screen.updatedAt', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'png', undefined);

      const expected = mockDevice.screens[0].updatedAt.toUTCString();
      expect(res.set).toHaveBeenCalledWith('Last-Modified', expected);
    });

    it('should return same Last-Modified on consecutive requests with same content', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res1 = mockExpressResponse();
      const res2 = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res1 as never, 'png', undefined);
      await controller.getDisplay(req, res2 as never, 'png', undefined);

      const expected = mockDevice.screens[0].updatedAt.toUTCString();
      expect(res1.set).toHaveBeenCalledWith('Last-Modified', expected);
      expect(res2.set).toHaveBeenCalledWith('Last-Modified', expected);
    });

    it('should return 304 with no body when If-None-Match matches current ETag', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();
      const etag = '"' + MOCK_PNG_KEY.slice(0, 32) + '"';

      await controller.getDisplay(req, res as never, 'png', etag);

      expect(res.status).toHaveBeenCalledWith(304);
      expect(res.end).toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should return 200 when If-None-Match does not match current ETag', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'png', '"non-matching-etag"');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should include ETag header in 304 response', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();
      const etag = '"' + MOCK_PNG_KEY.slice(0, 32) + '"';

      await controller.getDisplay(req, res as never, 'png', etag);

      expect(res.set).toHaveBeenCalledWith('ETag', etag);
      expect(res.status).toHaveBeenCalledWith(304);
    });

    it('should set Content-Type to image/png when format=png', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'png', undefined);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png');
    });

    it('should set Content-Type to application/octet-stream when format=raw', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'raw', undefined);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });

    it('should set Content-Disposition header correctly for png', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'png', undefined);

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="display.png"');
    });

    it('should set Content-Disposition header correctly for raw', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'raw', undefined);

      expect(res.set).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="display.raw"');
    });

    it('should persist contentHash in Prisma after 200 response', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'png', undefined);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockPrismaService.screen.update).toHaveBeenCalledWith({
        where: { id: mockDevice.screens[0].id },
        data: { contentHash: MOCK_PNG_KEY },
      });
    });

    it('should NOT persist contentHash after 304 response', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();
      const etag = '"' + MOCK_PNG_KEY.slice(0, 32) + '"';

      await controller.getDisplay(req, res as never, 'png', etag);

      expect(res.status).toHaveBeenCalledWith(304);
      expect(mockPrismaService.screen.update).not.toHaveBeenCalled();
    });
  });

  describe('checkIn', () => {
    it('should call devicesService.checkIn with deviceId from JWT', async () => {
      const dto = { firmwareVersion: '1.0.0' };
      const req = mockDeviceRequest(MOCK_DEVICE_ID);
      mockDevicesService.checkIn.mockResolvedValue({ hardwareId: 'E072A1F93108', contentChanged: false });

      const result = await controller.checkIn(req, dto);

      expect(mockDevicesService.checkIn).toHaveBeenCalledWith(MOCK_DEVICE_ID, dto);
      expect(result).toEqual({ hardwareId: 'E072A1F93108', contentChanged: false });
    });
  });

  describe('rotateSecret', () => {
    it('should call devicesService.rotateSecret with device id', async () => {
      mockDevicesService.rotateSecret.mockResolvedValue({ id: 1, rawSecret: 'new-secret' });

      const result = await controller.rotateSecret(1, { user: { userId: 1 } });

      expect(mockDevicesService.rotateSecret).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({ id: 1, rawSecret: 'new-secret' });
    });
  });

  describe('getDisplayProfiles', () => {
    it('should return catalog containing 6 display profiles with presets', () => {
      const profiles = controller.getDisplayProfiles();

      expect(profiles.length).toBe(6);
      const spectra = profiles.find(p => p.id === 'spectra6_7in3');
      expect(spectra).toBeDefined();
      expect(spectra?.hardwareNibbleMap).toEqual({
        black: 0,
        white: 1,
        green: 2,
        blue: 3,
        red: 4,
        yellow: 5,
      });
      expect(spectra?.presets.length).toBe(3);

      const mono = profiles.find(p => p.id === 'mono_800x480');
      expect(mono).toBeDefined();
      expect(mono?.presets.length).toBe(1);
    });
  });

  describe('update', () => {
    it('should delegate to devicesService.update', async () => {
      const dto = { name: 'New Name', rotation: 90 };
      const req = { user: { userId: 1 } };
      mockDevicesService.update.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.update(1, dto, req);

      expect(mockDevicesService.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('revoke', () => {
    it('should call devicesService.revoke with hard=false by default', async () => {
      const req = { user: { userId: 1 } };
      mockDevicesService.revoke.mockResolvedValue({ deviceId: 1, hardDeleted: false });

      const result = await controller.revoke(1, req, undefined);

      expect(mockDevicesService.revoke).toHaveBeenCalledWith(1, 1, false);
      expect(result).toEqual({ deviceId: 1, hardDeleted: false });
    });

    it('should call devicesService.revoke with hard=true when hard="true"', async () => {
      const req = { user: { userId: 1 } };
      mockDevicesService.revoke.mockResolvedValue({ deviceId: 1, hardDeleted: true });

      const result = await controller.revoke(1, req, 'true');

      expect(mockDevicesService.revoke).toHaveBeenCalledWith(1, 1, true);
      expect(result).toEqual({ deviceId: 1, hardDeleted: true });
    });
  });

  describe('forceRefresh', () => {
    it('should delegate to devicesService.forceRefresh', async () => {
      const req = { user: { userId: 1 } };
      mockDevicesService.forceRefresh.mockResolvedValue({
        deviceId: 1,
        invalidatedScreensCount: 1,
        refreshedAt: new Date(),
      });

      const result = await controller.forceRefresh(1, req);

      expect(mockDevicesService.forceRefresh).toHaveBeenCalledWith(1, 1);
      expect(result.deviceId).toBe(1);
      expect(result.invalidatedScreensCount).toBe(1);
    });
  });

  describe('getDisplay headers', () => {
    it('should set diagnostic display headers on 200 response', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      const res = mockExpressResponse();
      const req = mockDeviceRequest();

      await controller.getDisplay(req, res as never, 'raw', undefined);

      expect(res.set).toHaveBeenCalledWith('X-Display-Profile', 'spectra6_7in3');
      expect(res.set).toHaveBeenCalledWith('X-Display-Width', '800');
      expect(res.set).toHaveBeenCalledWith('X-Display-Height', '480');
      expect(res.set).toHaveBeenCalledWith('X-Display-Bpp', '4');
      expect(res.set).toHaveBeenCalledWith('X-Display-Rotation', '0');
      expect(res.set).toHaveBeenCalledWith('X-Display-Nibbles', '0:black, 1:white, 2:green, 3:blue, 4:red, 5:yellow');
    });
  });
});
