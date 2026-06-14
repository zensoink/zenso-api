import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DeviceJwtAuthGuard extends AuthGuard('device-jwt') {
  handleRequest<TUser = any>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Missing or invalid device token');
    }

    return user;
  }
}
