import { PrismaService } from '@core/prisma';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';

const mockBcryptCompare = jest.fn<Promise<boolean>, [string, string]>();

jest.mock('bcrypt', () => ({
  compare: (...args: [string, string]) => mockBcryptCompare(...args),
  hash: jest.fn().mockResolvedValue('$2b$10$mockedhash'),
}));

interface MockPrisma {
  user: { findUnique: jest.Mock };
  device: { findMany: jest.Mock };
}

interface MockJwt {
  sign: jest.Mock;
}

describe('AuthService', () => {
  let service: AuthService;
  let mockPrismaService: MockPrisma;
  let mockJwtService: MockJwt;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDevice = {
    id: 1,
    hardwareId: 'E072A1F93108',
    name: 'Test Device',
    width: 800,
    height: 480,
    palette: ['#000', '#fff'],
    lastSeenAt: null,
    firmwareVersion: null,
    deviceSecretHash: '$2b$10$hashedsecret',
    deviceTokenVersion: 1,
    revokedAt: null,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      user: { findUnique: jest.fn() },
      device: { findMany: jest.fn() },
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'auth.userSecret': 'test-user-secret',
                'auth.deviceSecret': 'test-device-secret',
                'auth.userExpiresIn': '1h',
                'auth.deviceExpiresIn': '1h',
              };
              return config[key];
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'auth.userExpiresIn') return 3600;
              if (key === 'auth.deviceExpiresIn') return 3600;
              if (key === 'auth.userSecret') return 'test-user-secret';
              if (key === 'auth.deviceSecret') return 'test-device-secret';
              throw new Error(`Config key "${key}" not found`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'correct-password');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw UnauthorizedException when email not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('unknown@example.com', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when passwordHash is null', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(service.validateUser('test@example.com', 'password')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token when credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(true);

      const result = await service.login('test@example.com', 'correct-password');

      expect(result).toEqual({ accessToken: 'mock-access-token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email, type: 'user' },
        expect.objectContaining({
          secret: 'test-user-secret',
          expiresIn: 3600,
        })
      );
    });

    it('should throw on invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateDevice', () => {
    it('should return device when credentials are valid', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([mockDevice]);
      mockBcryptCompare.mockResolvedValue(true);

      const result = await service.validateDevice('E072A1F93108', 'correct-secret');

      expect(result).toEqual(mockDevice);
      expect(mockPrismaService.device.findMany).toHaveBeenCalledWith({
        where: { hardwareId: 'E072A1F93108', revokedAt: null },
      });
    });

    it('should throw UnauthorizedException when no devices found', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([]);

      await expect(service.validateDevice('unknown-device', 'secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when secret is wrong for all devices', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([mockDevice]);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.validateDevice('E072A1F93108', 'wrong-secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when device is revoked', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([]);

      await expect(service.validateDevice('E072A1F93108', 'secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when device has no secret hash', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([{ ...mockDevice, deviceSecretHash: null }]);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.validateDevice('E072A1F93108', 'secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should iterate multiple devices until bcrypt matches', async () => {
      const deviceWithoutSecret = { ...mockDevice, id: 1, deviceSecretHash: null };
      const deviceWithWrongSecret = { ...mockDevice, id: 2, deviceSecretHash: '$2b$10$wronghash' };
      const deviceWithCorrectSecret = { ...mockDevice, id: 3, deviceSecretHash: '$2b$10$correcthash' };

      mockPrismaService.device.findMany.mockResolvedValue([
        deviceWithoutSecret,
        deviceWithWrongSecret,
        deviceWithCorrectSecret,
      ]);

      mockBcryptCompare
        .mockResolvedValueOnce(false) // deviceWithWrongSecret
        .mockResolvedValueOnce(true); // deviceWithCorrectSecret

      const result = await service.validateDevice('E072A1F93108', 'correct-secret');

      expect(result.id).toBe(3);
    });
  });

  describe('deviceLogin', () => {
    it('should return access token when credentials are valid', async () => {
      mockPrismaService.device.findMany.mockResolvedValue([mockDevice]);
      mockBcryptCompare.mockResolvedValue(true);

      const result = await service.deviceLogin('E072A1F93108', 'correct-secret');

      expect(result).toEqual({ accessToken: 'mock-access-token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockDevice.id,
          hardwareId: mockDevice.hardwareId,
          type: 'device',
          tokenVersion: mockDevice.deviceTokenVersion,
        },
        expect.objectContaining({
          secret: 'test-device-secret',
          expiresIn: 3600,
        })
      );
    });
  });
});
