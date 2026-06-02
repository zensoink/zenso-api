import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { DeviceJwtAuthGuard } from './device-jwt-auth.guard';

function mockExecutionContext(params: Record<string, string>, user?: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        params,
        user,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('DeviceJwtAuthGuard', () => {
  let guard: DeviceJwtAuthGuard;

  beforeEach(() => {
    guard = new DeviceJwtAuthGuard();
  });

  it('should throw when no user is provided', () => {
    const ctx = mockExecutionContext({ uid: 'device-001' }, undefined);

    expect(() => guard.handleRequest(null, null, null, ctx)).toThrow(UnauthorizedException);
  });

  it('should throw the original err when err is provided', () => {
    const ctx = mockExecutionContext({ uid: 'device-001' }, { uid: 'device-001' });

    expect(() => guard.handleRequest(new Error('auth error'), null, null, ctx)).toThrow('auth error');
  });

  it('should throw when uid param is missing', () => {
    const ctx = mockExecutionContext({}, { uid: 'device-001' });

    expect(() => guard.handleRequest(null, { uid: 'device-001' }, null, ctx)).toThrow(UnauthorizedException);
  });

  it('should throw when uid param does not match user uid', () => {
    const ctx = mockExecutionContext({ uid: 'device-001' }, { uid: 'device-999' });

    expect(() => guard.handleRequest(null, { uid: 'device-999' }, null, ctx)).toThrow(UnauthorizedException);
  });

  it('should return user when uid matches', () => {
    const user = { uid: 'device-001' };
    const ctx = mockExecutionContext({ uid: 'device-001' }, user);

    const result = guard.handleRequest(null, user, null, ctx);

    expect(result).toEqual(user);
  });

  it('should throw when user object does not have uid property', () => {
    const ctx = mockExecutionContext({ uid: 'device-001' }, { id: 1 });

    expect(() => guard.handleRequest(null, { id: 1 }, null, ctx)).toThrow(UnauthorizedException);
  });
});
