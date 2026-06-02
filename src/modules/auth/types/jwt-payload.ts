export interface UserJwtPayload {
  sub: number;
  email: string;
  type: 'user';
}

export interface DeviceJwtPayload {
  sub: number;
  uid: string;
  type: 'device';
  tokenVersion: number;
}
