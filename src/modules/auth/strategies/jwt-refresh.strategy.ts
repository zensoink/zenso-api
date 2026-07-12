import { PrismaService } from '@core/prisma';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

import type { UserJwtPayload } from '../types/jwt-payload';

const extractJwtFromCookie = (req: { cookies?: Record<string, string> }): string | null => {
  return req?.cookies?.refresh_token ?? null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: extractJwtFromCookie,
      secretOrKey: configService.getOrThrow<string>('auth.refreshSecret'),
    });
  }

  async validate(payload: UserJwtPayload) {
    if (payload.type !== 'user') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { userId: user.id, email: user.email };
  }
}
