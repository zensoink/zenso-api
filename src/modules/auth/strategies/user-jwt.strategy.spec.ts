import { PrismaService } from '@core/prisma';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import type { UserJwtPayload } from '../types/jwt-payload';
import { UserJwtStrategy } from './user-jwt.strategy';

describe('UserJwtStrategy', () => {
  let strategy: UserJwtStrategy;
  let mockPrisma: { user: { findUnique: jest.Mock } };

  const validPayload = { sub: 1, email: 'test@example.com', type: 'user' as const };

  beforeEach(async () => {
    mockPrisma = {
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserJwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'auth.userSecret') return 'test-secret';
              throw new Error(`Config key "${key}" not found`);
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    strategy = module.get<UserJwtStrategy>(UserJwtStrategy);
  });

  it('should return user data when user exists in DB', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com' });

    const result = await strategy.validate(validPayload);

    expect(result).toEqual({ userId: 1, email: 'test@example.com' });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should throw UnauthorizedException when user is not found in DB', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should throw UnauthorizedException when token type is not "user"', async () => {
    const payload = { sub: 1, email: 'test@example.com', type: 'device' } as unknown as UserJwtPayload;

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
