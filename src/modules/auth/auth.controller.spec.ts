import type { INestApplication } from '@nestjs/common';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

interface MockAuthService {
  login: jest.Mock;
  deviceLogin: jest.Mock;
  validateUser: jest.Mock;
  validateDevice: jest.Mock;
}

function asAccessTokenResponse(body: unknown): { accessToken: string } {
  return body as { accessToken: string };
}

function asMessageResponse(body: unknown): { message: unknown } {
  return body as { message: unknown };
}

describe('AuthController', () => {
  let app: INestApplication<App>;
  let mockAuthService: MockAuthService;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      deviceLogin: jest.fn(),
      validateUser: jest.fn(),
      validateDevice: jest.fn(),
    };

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

      const body = asAccessTokenResponse(res.body);
      expect(body).toEqual({ accessToken: 'mock-token' });
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should return 401 when credentials are invalid', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException());

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' })
        .expect(401);

      const body = asMessageResponse(res.body);
      expect(body.message).toBeDefined();
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ password: 'password123' }).expect(400);

      const body = asMessageResponse(res.body);
      expect(body.message).toBeDefined();
    });

    it('should return 400 when email is not a valid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);

      const body = asMessageResponse(res.body);
      expect(body.message).toBeDefined();
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      const body = asMessageResponse(res.body);
      expect(body.message).toBeDefined();
    });
  });

  describe('POST /auth/device/login', () => {
    it('should return 200 with accessToken when credentials are valid', async () => {
      mockAuthService.deviceLogin.mockResolvedValue({ accessToken: 'mock-device-token' });

      const res = await request(app.getHttpServer())
        .post('/auth/device/login')
        .send({ hardware_id: 'E072A1F93108', secret: 'valid-secret' })
        .expect(200);

      const body = asAccessTokenResponse(res.body);
      expect(body).toEqual({ accessToken: 'mock-device-token' });
      expect(mockAuthService.deviceLogin).toHaveBeenCalledWith('E072A1F93108', 'valid-secret');
    });

    it('should return 401 when credentials are invalid', async () => {
      mockAuthService.deviceLogin.mockRejectedValue(new UnauthorizedException());

      const res = await request(app.getHttpServer())
        .post('/auth/device/login')
        .send({ hardware_id: 'E072A1F93108', secret: 'wrong-secret' })
        .expect(401);

      const body = asMessageResponse(res.body);
      expect(body.message).toBeDefined();
    });

    it('should return 400 when hardware_id is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/device/login')
        .send({ secret: 'valid-secret' })
        .expect(400);

      const body = asMessageResponse(res.body);
      expect(body.message).toBeDefined();
    });

    it('should return 400 when secret is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/device/login')
        .send({ hardware_id: 'E072A1F93108' })
        .expect(400);

      const body = asMessageResponse(res.body);
      expect(body.message).toBeDefined();
    });
  });
});
