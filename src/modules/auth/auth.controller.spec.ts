/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */

import type { INestApplication } from '@nestjs/common';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let app: INestApplication<App>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      deviceLogin: jest.fn(),
      validateUser: jest.fn(),
      validateDevice: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return 200 with accessToken when credentials are valid', async () => {
      mockAuthService.login.mockResolvedValue({ accessToken: 'mock-token' });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(res.body).toEqual({ accessToken: 'mock-token' });
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should return 401 when credentials are invalid', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException());

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ password: 'password123' }).expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when email is not a valid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /auth/device/login', () => {
    it('should return 200 with accessToken when credentials are valid', async () => {
      mockAuthService.deviceLogin.mockResolvedValue({ accessToken: 'mock-device-token' });

      const res = await request(app.getHttpServer())
        .post('/auth/device/login')
        .send({ uid: 'device-001', secret: 'valid-secret' })
        .expect(200);

      expect(res.body).toEqual({ accessToken: 'mock-device-token' });
      expect(mockAuthService.deviceLogin).toHaveBeenCalledWith('device-001', 'valid-secret');
    });

    it('should return 401 when credentials are invalid', async () => {
      mockAuthService.deviceLogin.mockRejectedValue(new UnauthorizedException());

      const res = await request(app.getHttpServer())
        .post('/auth/device/login')
        .send({ uid: 'device-001', secret: 'wrong-secret' })
        .expect(401);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when uid is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/device/login')
        .send({ secret: 'valid-secret' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 when secret is missing', async () => {
      const res = await request(app.getHttpServer()).post('/auth/device/login').send({ uid: 'device-001' }).expect(400);

      expect(res.body.message).toBeDefined();
    });
  });
});
