import { PrismaService } from '@core/prisma';
import { Test, TestingModule } from '@nestjs/testing';

import { ScreensService } from './screens.service';

describe('ScreensService', () => {
  let service: ScreensService;
  let mockPrismaService: {
    screen: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrismaService = {
      screen: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
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

      const result = await service.create(dto);

      expect(mockPrismaService.screen.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          userId: dto.userId,
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
