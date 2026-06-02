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
      secret: this.configService.get<string>('auth.userSecret'),
      expiresIn: this.configService.get<string>('auth.userExpiresIn'),
    });

    return { accessToken };
  }

  async validateDevice(uid: string, secret: string) {
    const device = await this.prisma.device.findUnique({ where: { uid } });

    if (!device) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    if (!device.deviceSecretHash) {
      throw new UnauthorizedException('Device has no secret configured');
    }

    if (device.revokedAt) {
      throw new UnauthorizedException('Device has been revoked');
    }

    const valid = await bcrypt.compare(secret, device.deviceSecretHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid device credentials');
    }

    return device;
  }

  async deviceLogin(uid: string, secret: string) {
    const device = await this.validateDevice(uid, secret);

    const payload: DeviceJwtPayload = {
      sub: device.id,
      uid: device.uid,
      type: 'device',
      tokenVersion: device.deviceTokenVersion,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.deviceSecret'),
      expiresIn: this.configService.get<string>('auth.deviceExpiresIn'),
    });

    return { accessToken };
  }
}
