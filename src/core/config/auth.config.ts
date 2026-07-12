import { registerAs } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';

type JwtExpiresIn = JwtSignOptions['expiresIn'];

function requireSecret(envVar: string, fallback: string): string {
  const value = process.env[envVar];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${envVar} is required in production`);
    }
    return fallback;
  }
  return value;
}

function parseDurationToSeconds(value: string): number {
  const match = new RegExp(/^(\d+)\s*([smhdwy])$/).exec(value);
  if (!match) throw new Error(`Cannot parse duration: "${value}". Use a duration string like 1h, 7d, 30m.`);
  const n = Number.parseInt(match[1], 10);
  const multi: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, y: 31536000 };
  return n * (multi[match[2]] ?? 1);
}

function parseJwtExpiresIn(value: string | undefined, fallback: JwtExpiresIn): number {
  if (!value) {
    if (typeof fallback === 'number') return fallback;
    if (typeof fallback === 'string') return parseDurationToSeconds(fallback);
    throw new Error('No JWT expiresIn value configured and no valid fallback provided.');
  }
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  if (/^\d+\s*([smhdwy])$/.test(normalized)) return parseDurationToSeconds(normalized);
  throw new Error(
    `Invalid JWT expiresIn value: "${value}". Use a number (seconds) or a duration string (e.g., 1h, 7d, 30m).`
  );
}

export default registerAs('auth', () => ({
  userSecret: requireSecret('JWT_USER_SECRET', 'dev-user-secret-change-me'),
  deviceSecret: requireSecret('JWT_DEVICE_SECRET', 'dev-device-secret-change-me'),
  refreshSecret: requireSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  userExpiresIn: parseJwtExpiresIn(process.env.JWT_USER_EXPIRES_IN, '1h'),
  deviceExpiresIn: parseJwtExpiresIn(process.env.JWT_DEVICE_EXPIRES_IN, '1h'),
  refreshExpiresIn: parseJwtExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
}));
