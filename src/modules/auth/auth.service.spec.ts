/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */

import { PrismaService } from '@core/prisma';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';

const mockBcryptCompare: jest.Mock<Promise<boolean>, [string, string]> = jest.fn();

jest.mock('bcrypt', () => ({
  compare: (...args: [string, string]) => mockBcryptCompare(...args),
  hash: jest.fn().mockResolvedValue('$2b$10$mockedhash'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockJwtService: jest.Mocked<JwtService>;

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
    uid: 'device-001',
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
      user: {
        findUnique: jest.fn(),
      },
      device: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    } as unknown as jest.Mocked<JwtService>;

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
          expiresIn: '1h',
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
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      mockBcryptCompare.mockResolvedValue(true);

      const result = await service.validateDevice('device-001', 'correct-secret');

      expect(result).toEqual(mockDevice);
      expect(mockPrismaService.device.findUnique).toHaveBeenCalledWith({
        where: { uid: 'device-001' },
      });
    });

    it('should throw UnauthorizedException when device not found', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);

      await expect(service.validateDevice('unknown-device', 'secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when secret is wrong', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(service.validateDevice('device-001', 'wrong-secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when device is revoked', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        revokedAt: new Date(),
      });

      await expect(service.validateDevice('device-001', 'secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when device has no secret hash', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        ...mockDevice,
        deviceSecretHash: null,
      });

      await expect(service.validateDevice('device-001', 'secret')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deviceLogin', () => {
    it('should return access token when credentials are valid', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(mockDevice);
      mockBcryptCompare.mockResolvedValue(true);

      const result = await service.deviceLogin('device-001', 'correct-secret');

      expect(result).toEqual({ accessToken: 'mock-access-token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockDevice.id,
          uid: mockDevice.uid,
          type: 'device',
          tokenVersion: mockDevice.deviceTokenVersion,
        },
        expect.objectContaining({
          secret: 'test-device-secret',
          expiresIn: '1h',
        })
      );
    });
  });
});
