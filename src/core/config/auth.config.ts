import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  userSecret: process.env.JWT_USER_SECRET || 'dev-user-secret-change-me',
  deviceSecret: process.env.JWT_DEVICE_SECRET || 'dev-device-secret-change-me',
  userExpiresIn: process.env.JWT_USER_EXPIRES_IN || '1h',
  deviceExpiresIn: process.env.JWT_DEVICE_EXPIRES_IN || '1h',
}));
