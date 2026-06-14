import { UnauthorizedException } from '@nestjs/common';

import { DeviceJwtAuthGuard } from './device-jwt-auth.guard';

describe('DeviceJwtAuthGuard', () => {
  let guard: DeviceJwtAuthGuard;

  beforeEach(() => {
    guard = new DeviceJwtAuthGuard();
  });

  it('should throw when no user is provided', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });

  it('should throw the original err when err is provided', () => {
    expect(() => guard.handleRequest(new Error('auth error'), null)).toThrow('auth error');
  });

  it('should return user when valid', () => {
    const user = { deviceId: 1, hardwareId: 'E072A1F93108', tokenVersion: 1 };

    const result = guard.handleRequest(null, user);

    expect(result).toEqual(user);
  });
});
