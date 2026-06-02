import { PrismaService } from '@core/prisma';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PluginInstancesService } from './plugin-instances.service';

describe('PluginInstancesService', () => {
  let service: PluginInstancesService;
  let mockPrismaService: {
    $transaction: jest.Mock;
    pluginInstance: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    screenSlot: {
      findMany: jest.Mock;
    };
    screen: {
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrismaService = {
      $transaction: jest.fn(),
      pluginInstance: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      screenSlot: {
        findMany: jest.fn(),
      },
      screen: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginInstancesService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<PluginInstancesService>(PluginInstancesService);
  });

  describe('update', () => {
    it('updates plugin instance and invalidates all related screens', async () => {
      const existing = { id: 1, name: 'Old' };
      const dto = { name: 'Updated' };
      const updated = { id: 1, name: 'Updated' };

      mockPrismaService.pluginInstance.findUnique.mockResolvedValue(existing);
      mockPrismaService.screenSlot.findMany.mockResolvedValue([{ screenId: 10 }, { screenId: 20 }]);
      mockPrismaService.$transaction.mockResolvedValue([updated, undefined, undefined]);

      await service.update(1, dto);

      expect(mockPrismaService.pluginInstance.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrismaService.screenSlot.findMany).toHaveBeenCalledWith({
        where: { pluginInstanceId: 1 },
        select: { screenId: true },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledWith([
        mockPrismaService.pluginInstance.update({
          where: { id: 1 },
          data: { name: 'Updated' },
        }),
        mockPrismaService.screen.update({
          where: { id: 10 },
          data: { contentHash: null },
        }),
        mockPrismaService.screen.update({
          where: { id: 20 },
          data: { contentHash: null },
        }),
      ]);
    });

    it('deduplicates screen IDs when same screen has multiple slots', async () => {
      const existing = { id: 1, name: 'Old' };
      const dto = { name: 'Updated' };

      mockPrismaService.pluginInstance.findUnique.mockResolvedValue(existing);
      mockPrismaService.screenSlot.findMany.mockResolvedValue([{ screenId: 10 }, { screenId: 10 }, { screenId: 20 }]);
      mockPrismaService.$transaction.mockResolvedValue([undefined, undefined, undefined]);

      await service.update(1, dto);

      // screen.update should be called for [10, 20] (deduplicated), not [10, 10, 20]
      expect(mockPrismaService.screen.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.screen.update).toHaveBeenNthCalledWith(1, {
        where: { id: 10 },
        data: { contentHash: null },
      });
      expect(mockPrismaService.screen.update).toHaveBeenNthCalledWith(2, {
        where: { id: 20 },
        data: { contentHash: null },
      });
    });

    it('succeeds when no screens are linked to the plugin instance', async () => {
      const existing = { id: 1, name: 'Old' };
      const dto = { name: 'Updated' };
      const updated = { id: 1, name: 'Updated' };

      mockPrismaService.pluginInstance.findUnique.mockResolvedValue(existing);
      mockPrismaService.screenSlot.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockResolvedValue([updated]);

      await service.update(1, dto);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith([
        mockPrismaService.pluginInstance.update({
          where: { id: 1 },
          data: { name: 'Updated' },
        }),
      ]);
    });

    it('throws NotFoundException when plugin instance does not exist', async () => {
      mockPrismaService.pluginInstance.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });
});
