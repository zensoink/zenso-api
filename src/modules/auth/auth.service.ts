import { PrismaService } from '@core/prisma';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import type { DeviceJwtPayload, UserJwtPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload: UserJwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'user',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('auth.userSecret'),
      expiresIn: this.configService.getOrThrow<number>('auth.userExpiresIn'),
    });

    return { accessToken };
  }

  async validateDevice(hardwareId: string, secret: string) {
    const devices = await this.prisma.device.findMany({
      where: { hardwareId, revokedAt: null },
    });

    if (devices.length === 0) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    for (const device of devices) {
      if (device.deviceSecretHash && (await bcrypt.compare(secret, device.deviceSecretHash))) {
        return device;
      }
    }

    throw new UnauthorizedException('Invalid device credentials');
  }

  async deviceLogin(hardwareId: string, secret: string) {
    const device = await this.validateDevice(hardwareId, secret);

    const payload: DeviceJwtPayload = {
      sub: device.id,
      hardwareId: device.hardwareId,
      type: 'device',
      tokenVersion: device.deviceTokenVersion,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('auth.deviceSecret'),
      expiresIn: this.configService.getOrThrow<number>('auth.deviceExpiresIn'),
    });

    return { accessToken };
  }
}
