import { PrismaService } from '@core/prisma';

import { ContextAggregationService } from './context-aggregation.service';

describe('ContextAggregationService timezone', () => {
  let service: ContextAggregationService;
  let mockPrisma: { screen: { findUnique: jest.Mock } };
  let savedEnv: string | undefined;

  const baseScreen = {
    id: 1,
    timeZoneIana: null,
    user: { id: 7, name: 'Alice', timeZoneIana: null },
    device: null,
  };

  beforeEach(() => {
    savedEnv = process.env.ZENSO_DEFAULT_TIMEZONE;
    delete process.env.ZENSO_DEFAULT_TIMEZONE;
    mockPrisma = { screen: { findUnique: jest.fn() } };
    service = new ContextAggregationService(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.ZENSO_DEFAULT_TIMEZONE;
    else process.env.ZENSO_DEFAULT_TIMEZONE = savedEnv;
  });

  function mockScreen(overrides: Record<string, unknown> = {}) {
    mockPrisma.screen.findUnique.mockResolvedValue({ ...baseScreen, ...overrides });
  }

  async function timeZoneIana() {
    const ctx = await service.buildContext({ screenId: 1, width: 800, height: 480 });
    return ctx.zenso.user.time_zone_iana;
  }

  it('prefers the screen timezone over user and default', async () => {
    mockScreen({ timeZoneIana: 'America/New_York', user: { ...baseScreen.user, timeZoneIana: 'Europe/Warsaw' } });

    expect(await timeZoneIana()).toBe('America/New_York');
  });

  it('falls back to the user timezone when the screen has none', async () => {
    mockScreen({ user: { ...baseScreen.user, timeZoneIana: 'Asia/Tokyo' } });

    expect(await timeZoneIana()).toBe('Asia/Tokyo');
  });

  it('falls back to ZENSO_DEFAULT_TIMEZONE when neither screen nor user set one', async () => {
    process.env.ZENSO_DEFAULT_TIMEZONE = 'Australia/Sydney';
    mockScreen();

    expect(await timeZoneIana()).toBe('Australia/Sydney');
  });

  it('falls back to Europe/Warsaw when nothing is configured', async () => {
    mockScreen();

    expect(await timeZoneIana()).toBe('Europe/Warsaw');
  });

  it('ignores invalid timezones at every level', async () => {
    process.env.ZENSO_DEFAULT_TIMEZONE = 'Not/AZone';
    mockScreen({ timeZoneIana: 'Bogus', user: { ...baseScreen.user, timeZoneIana: '' } });

    expect(await timeZoneIana()).toBe('Europe/Warsaw');
  });

  it('computes utcOffset in seconds for the resolved zone and season', async () => {
    mockScreen({ timeZoneIana: 'Europe/Warsaw' });
    const summer = await service.buildContext({ screenId: 1, width: 800, height: 480 });

    expect(summer.zenso.system.timestamp_utc).toBeGreaterThan(0);
    expect(summer.zenso.user.utc_offset).toBe(7200);

    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
    try {
      const winter = await service.buildContext({ screenId: 1, width: 800, height: 480 });
      expect(winter.zenso.user.utc_offset).toBe(3600);
    } finally {
      jest.useRealTimers();
    }
  });

  it('exposes the plugin scope without legacy aliases', async () => {
    mockScreen();
    const ctx = await service.buildContext({
      screenId: 1,
      width: 800,
      height: 480,
      manifestJson: { id: 'zenso/test', name: 'Test', core_min: '0.0.0' },
      pluginVersion: '1.2.3',
    });

    expect(ctx.plugin).toMatchObject({ id: 'zenso/test', name: 'Test', version: '1.2.3', core_min: '0.0.0' });
    expect('manifest' in ctx).toBe(false);
    expect(ctx.zenso.user).not.toHaveProperty('timeZoneIana');
    expect(ctx.zenso.system).not.toHaveProperty('timestampUtc');
  });
});
