import { PrismaService } from '@core/prisma';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { DeviceJwtPayload } from '../types/jwt-payload';

@Injectable()
export class DeviceJwtStrategy extends PassportStrategy(Strategy, 'device-jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('auth.deviceSecret'),
    });
  }

  async validate(payload: DeviceJwtPayload) {
    if (payload.type !== 'device') {
      throw new UnauthorizedException('Invalid token type');
    }

    const device = await this.prisma.device.findUnique({
      where: { id: payload.sub },
    });

    if (!device) {
      throw new UnauthorizedException('Device not found');
    }

    if (device.revokedAt) {
      throw new UnauthorizedException('Device has been revoked');
    }

    if (payload.tokenVersion !== device.deviceTokenVersion) {
      throw new UnauthorizedException('Token version outdated');
    }

    return { deviceId: device.id, hardwareId: device.hardwareId, tokenVersion: device.deviceTokenVersion };
  }
}
