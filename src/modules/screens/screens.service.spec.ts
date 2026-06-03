import { PrismaService } from '@core/prisma';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ScreensService } from './screens.service';

describe('ScreensService', () => {
  let service: ScreensService;
  let mockPrismaService: {
    screen: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrismaService = {
      screen: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ScreensService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ScreensService>(ScreensService);
  });

  describe('create', () => {
    it('calls prisma.screen.create with correct data', async () => {
      const dto = {
        name: 'Test Screen',
        userId: 1,
        deviceId: 2,
        layoutType: 'full',
        width: 800,
        height: 480,
        isActive: true,
      };

      const expected = { id: 1, ...dto };
      mockPrismaService.screen.create.mockResolvedValue(expected);

      const result = await service.create(1, dto);

      expect(mockPrismaService.screen.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          userId: 1,
          layoutType: dto.layoutType,
          width: dto.width,
          height: dto.height,
          deviceId: dto.deviceId,
          isActive: dto.isActive,
        },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('returns array with slots included', async () => {
      const screens = [
        { id: 1, name: 'Screen 1', slots: [{ id: 1 }] },
        { id: 2, name: 'Screen 2', slots: [] },
      ];
      mockPrismaService.screen.findMany.mockResolvedValue(screens);

      const result = await service.findAll();

      expect(mockPrismaService.screen.findMany).toHaveBeenCalledWith({
        include: { slots: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(screens);
    });
  });

  describe('update', () => {
    it('updates screen and sets contentHash to null', async () => {
      const existing = { id: 1, name: 'Old Name' };
      const dto = { name: 'New Name' };
      const updated = { id: 1, name: 'New Name', contentHash: null };

      mockPrismaService.screen.findUnique.mockResolvedValue(existing);
      mockPrismaService.screen.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockPrismaService.screen.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrismaService.screen.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto, contentHash: null },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when screen does not exist', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes screen by id', async () => {
      const existing = { id: 1, name: 'Screen to Delete' };

      mockPrismaService.screen.findUnique.mockResolvedValue(existing);
      mockPrismaService.screen.delete.mockResolvedValue(existing);

      const result = await service.delete(1);

      expect(mockPrismaService.screen.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrismaService.screen.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(existing);
    });

    it('throws NotFoundException when screen does not exist', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('returns screen with slots and pluginInstances', async () => {
      const screen = {
        id: 1,
        name: 'Test Screen',
        slots: [{ id: 1, pluginInstance: { id: 5, name: 'Plugin' } }],
      };
      mockPrismaService.screen.findUnique.mockResolvedValue(screen);

      const result = await service.findById(1);

      expect(mockPrismaService.screen.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          slots: {
            include: { pluginInstance: true },
            orderBy: { renderOrder: 'asc' },
          },
        },
      });
      expect(result).toEqual(screen);
    });

    it('returns null for unknown id', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });
});
