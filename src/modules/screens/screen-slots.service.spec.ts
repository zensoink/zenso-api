import { PrismaService } from '@core/prisma';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ScreenSlotsService } from './screen-slots.service';

describe('ScreenSlotsService', () => {
  let service: ScreenSlotsService;
  let mockPrismaService: {
    $transaction: jest.Mock;
    screen: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    screenSlot: {
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    pluginInstance: {
      findUnique: jest.Mock;
    };
  };

  const mockScreen = {
    id: 1,
    name: 'Test Screen',
    width: 800,
    height: 480,
    layoutType: 'full',
  };

  const mockPluginInstance = {
    id: 10,
    name: 'Test Plugin',
  };

  beforeEach(async () => {
    mockPrismaService = {
      $transaction: jest.fn(),
      screen: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      screenSlot: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      pluginInstance: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ScreenSlotsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<ScreenSlotsService>(ScreenSlotsService);
  });

  describe('create', () => {
    it('creates slot and invalidates contentHash on parent screen', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockPrismaService.pluginInstance.findUnique.mockResolvedValue(mockPluginInstance);
      mockPrismaService.screenSlot.create.mockResolvedValue({
        id: 1,
        screenId: 1,
        pluginInstanceId: 10,
        slotKey: 'A',
        x: 0,
        y: 0,
        w: 800,
        h: 480,
        zIndex: 0,
        renderOrder: 0,
      });

      const result = await service.create(1, {
        pluginInstanceId: 10,
        slotKey: 'A',
      });

      expect(mockPrismaService.screen.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrismaService.pluginInstance.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(mockPrismaService.screenSlot.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 1);
    });

    it('calls prisma.screen.update with contentHash: null after creation', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(mockScreen);
      mockPrismaService.pluginInstance.findUnique.mockResolvedValue(mockPluginInstance);
      mockPrismaService.screenSlot.create.mockResolvedValue({
        id: 1,
        screenId: 1,
        pluginInstanceId: 10,
        slotKey: 'A',
        x: 0,
        y: 0,
        w: 800,
        h: 480,
        zIndex: 0,
        renderOrder: 0,
      });

      await service.create(1, {
        pluginInstanceId: 10,
        slotKey: 'A',
      });

      expect(mockPrismaService.screen.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { contentHash: null },
      });
    });

    it('throws NotFoundException when screen is not found', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(service.create(999, { pluginInstanceId: 10, slotKey: 'A' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    const mockSlot = {
      id: 5,
      screenId: 1,
      pluginInstanceId: 10,
      slotKey: 'A',
    };

    it('deletes slot and invalidates parent screen contentHash', async () => {
      mockPrismaService.screenSlot.findUnique.mockResolvedValue(mockSlot);
      mockPrismaService.$transaction.mockResolvedValue([undefined, undefined]);

      await service.delete(1, 5);

      expect(mockPrismaService.screenSlot.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith([
        mockPrismaService.screenSlot.delete({ where: { id: 5 } }),
        mockPrismaService.screen.update({
          where: { id: 1 },
          data: { contentHash: null },
        }),
      ]);
    });

    it('throws NotFoundException when slot does not exist', async () => {
      mockPrismaService.screenSlot.findUnique.mockResolvedValue(null);

      await expect(service.delete(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when slot does not belong to screen', async () => {
      mockPrismaService.screenSlot.findUnique.mockResolvedValue({ ...mockSlot, screenId: 2 });

      await expect(service.delete(1, 5)).rejects.toThrow(NotFoundException);
    });
  });
});
