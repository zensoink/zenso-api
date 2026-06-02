import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

function assertHasUid(value: unknown): asserts value is { uid: string } {
  if (typeof value !== 'object' || value === null || !('uid' in value)) {
    throw new UnauthorizedException('Invalid device user object');
  }
}

@Injectable()
export class DeviceJwtAuthGuard extends AuthGuard('device-jwt') {
  handleRequest<TUser = any>(err: Error | null, user: TUser, info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Missing or invalid device token');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const uid = request.params?.uid;

    if (!uid) {
      throw new UnauthorizedException('Missing device UID parameter');
    }
    assertHasUid(user);
    if (user.uid !== uid) {
      throw new UnauthorizedException('Device UID mismatch');
    }

    return user;
  }
}
