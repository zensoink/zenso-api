export interface UserJwtPayload {
  sub: number;
  email: string;
  type: 'user';
}

export interface DeviceJwtPayload {
  sub: number;
  hardwareId: string;
  type: 'device';
  tokenVersion: number;
}
