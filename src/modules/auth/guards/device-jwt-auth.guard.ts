import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class DeviceJwtAuthGuard extends AuthGuard('device-jwt') {
  handleRequest<TUser = any>(err: Error | null, user: TUser, info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Missing or invalid device token');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const uid = request.params?.uid;
    const userRecord = user as { uid: string };

    if (uid && userRecord.uid !== uid) {
      throw new UnauthorizedException('Device UID mismatch');
    }

    return user;
  }
}
