import { PrismaService } from '@core/prisma';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ScreenSlotsService } from './screen-slots.service';

describe('ScreenSlotsService', () => {
  let service: ScreenSlotsService;
  let mockPrismaService: {
    screen: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    screenSlot: {
      create: jest.Mock;
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
      screen: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      screenSlot: {
        create: jest.fn(),
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
});
