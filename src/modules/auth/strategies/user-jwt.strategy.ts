import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { UserJwtPayload } from '../types/jwt-payload';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('auth.userSecret'),
    });
  }

  validate(payload: UserJwtPayload) {
    if (payload.type !== 'user') {
      throw new UnauthorizedException('Invalid token type');
    }

    return { userId: payload.sub, email: payload.email };
  }
}
