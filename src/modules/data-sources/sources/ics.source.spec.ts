import { DataSourceContext } from '../data-sources.service';
import { guardedFetch } from '../http/guarded-fetch';
import { type CalendarEventOutput, IcsSource } from './ics.source';

jest.mock('../http/guarded-fetch', () => ({
  guardedFetch: jest.fn(),
}));

const FIXTURE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Zenso//Test//EN
BEGIN:VTIMEZONE
TZID:Europe/Warsaw
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:recurring-1
DTSTAMP:20260101T000000Z
DTSTART;TZID=Europe/Warsaw:20260727T140000
DTEND;TZID=Europe/Warsaw:20260727T150000
RRULE:FREQ=WEEKLY;COUNT=10
SUMMARY:Weekly standup
LOCATION:Room 4
END:VEVENT
BEGIN:VEVENT
UID:allday-1
DTSTAMP:20260101T000000Z
DTSTART;VALUE=DATE:20260801
DTEND;VALUE=DATE:20260802
SUMMARY:Farmers market
END:VEVENT
BEGIN:VEVENT
UID:timed-1
DTSTAMP:20260101T000000Z
DTSTART;TZID=Europe/Warsaw:20260801T143000
DTEND;TZID=Europe/Warsaw:20260801T153000
SUMMARY:Team standup
LOCATION:Room 4
END:VEVENT
BEGIN:VEVENT
UID:rich-1
DTSTAMP:20260101T000000Z
DTSTART;TZID=Europe/Warsaw:20260801T090000
DTEND;TZID=Europe/Warsaw:20260801T093000
SUMMARY:Dentist appointment
LOCATION:Clinic
DESCRIPTION:Annual checkup
STATUS:TENTATIVE
URL:https://example.com/dentist
END:VEVENT
BEGIN:VEVENT
UID:cancelled-1
DTSTAMP:20260101T000000Z
DTSTART;TZID=Europe/Warsaw:20260801T100000
DTEND;TZID=Europe/Warsaw:20260801T110000
STATUS:CANCELLED
SUMMARY:Cancelled meeting
END:VEVENT
BEGIN:VEVENT
UID:multiday-1
DTSTAMP:20260101T000000Z
DTSTART;TZID=Europe/Warsaw:20260731T220000
DTEND;TZID=Europe/Warsaw:20260802T040000
SUMMARY:Weekend trip
END:VEVENT
END:VCALENDAR`;

describe('IcsSource', () => {
  let source: IcsSource;
  let ctx: DataSourceContext;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-01T08:15:00Z'));
    (guardedFetch as jest.Mock).mockReset();
    source = new IcsSource();
    ctx = {
      configJson: {
        calendar_feeds: ['https://feeds.example/cal.ics'],
        days_ahead: 14,
      },
      manifestConfig: {
        urls_field: 'calendar_feeds',
        days_ahead_field: 'days_ahead',
      },
      timeZoneIana: 'Europe/Warsaw',
      today: '2026-08-01',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the exact contract fields for recurring, all-day, timed, and multi-day events', async () => {
    (guardedFetch as jest.Mock).mockResolvedValue(FIXTURE_ICS);

    const result = await source.resolve(ctx);

    expect(result).toMatchObject({
      today: '2026-08-01',
      today_label: 'Saturday, August 1, 2026',
      now_label: '10:15',
      days_ahead: 14,
      fetched_at: '2026-08-01T08:15:00.000Z',
      sources: ['https://feeds.example/cal.ics'],
    });
    expect(result.events).toEqual([
      {
        title: 'Farmers market',
        location: null,
        description: null,
        status: null,
        url: null,
        uid: 'allday-1',
        recurring: false,
        color: null,
        all_day: true,
        day_label: '2026-08-01',
        start: '2026-08-01T00:00:00+02:00',
        end: '2026-08-02T00:00:00+02:00',
        time_label: '',
        end_time_label: null,
      },
      {
        title: 'Dentist appointment',
        location: 'Clinic',
        description: 'Annual checkup',
        status: 'TENTATIVE',
        url: 'https://example.com/dentist',
        uid: 'rich-1',
        recurring: false,
        color: null,
        all_day: false,
        day_label: '2026-08-01',
        start: '2026-08-01T09:00:00+02:00',
        end: '2026-08-01T09:30:00+02:00',
        time_label: '09:00',
        end_time_label: '09:30',
      },
      {
        title: 'Team standup',
        location: 'Room 4',
        description: null,
        status: null,
        url: null,
        uid: 'timed-1',
        recurring: false,
        color: null,
        all_day: false,
        day_label: '2026-08-01',
        start: '2026-08-01T14:30:00+02:00',
        end: '2026-08-01T15:30:00+02:00',
        time_label: '14:30',
        end_time_label: '15:30',
      },
      {
        title: 'Weekend trip',
        location: null,
        description: null,
        status: null,
        url: null,
        uid: 'multiday-1',
        recurring: false,
        color: null,
        all_day: false,
        day_label: '2026-08-01',
        start: '2026-07-31T22:00:00+02:00',
        end: '2026-08-02T04:00:00+02:00',
        time_label: '22:00',
        end_time_label: '04:00',
      },
      {
        title: 'Weekly standup',
        location: 'Room 4',
        description: null,
        status: null,
        url: null,
        uid: 'recurring-1',
        recurring: true,
        color: null,
        all_day: false,
        day_label: '2026-08-03',
        start: '2026-08-03T14:00:00+02:00',
        end: '2026-08-03T15:00:00+02:00',
        time_label: '14:00',
        end_time_label: '15:00',
      },
      {
        title: 'Weekly standup',
        location: 'Room 4',
        description: null,
        status: null,
        url: null,
        uid: 'recurring-1',
        recurring: true,
        color: null,
        all_day: false,
        day_label: '2026-08-10',
        start: '2026-08-10T14:00:00+02:00',
        end: '2026-08-10T15:00:00+02:00',
        time_label: '14:00',
        end_time_label: '15:00',
      },
    ]);
  });

  it('resolves custom field names and clamps days_ahead to 1..60', async () => {
    (guardedFetch as jest.Mock).mockResolvedValue(FIXTURE_ICS);
    const customCtx: DataSourceContext = {
      ...ctx,
      configJson: { feeds: ['https://feeds.example/cal.ics'], horizon: 200 },
      manifestConfig: { urls_field: 'feeds', days_ahead_field: 'horizon' },
    };

    const result = await source.resolve(customCtx);

    expect(result.days_ahead).toBe(60);
    expect(result.sources).toEqual(['https://feeds.example/cal.ics']);
  });

  it('defaults days_ahead to 14 when the field is missing', async () => {
    (guardedFetch as jest.Mock).mockResolvedValue(FIXTURE_ICS);
    const result = await source.resolve({ ...ctx, configJson: { calendar_feeds: ['https://feeds.example/cal.ics'] } });

    expect(result.days_ahead).toBe(14);
  });

  it('drops non-https feed URLs', async () => {
    (guardedFetch as jest.Mock).mockResolvedValue(FIXTURE_ICS);
    const result = await source.resolve({
      ...ctx,
      configJson: {
        calendar_feeds: ['https://feeds.example/cal.ics', 'http://feeds.example/insecure.ics'],
      },
    });

    expect(result.sources).toEqual(['https://feeds.example/cal.ics']);
    expect(guardedFetch).toHaveBeenCalledTimes(1);
  });

  it('resolves object-array feeds (url + color) and stamps color on events', async () => {
    (guardedFetch as jest.Mock).mockResolvedValue(FIXTURE_ICS);
    const result = await source.resolve({
      ...ctx,
      configJson: {
        calendar_feeds: [{ url: 'https://feeds.example/cal.ics', color: '#FF0000' }],
        days_ahead: 14,
      },
    });

    expect(result.sources).toEqual(['https://feeds.example/cal.ics']);
    const events = result.events as CalendarEventOutput[];
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(event => event.color === '#FF0000')).toBe(true);
  });

  it('returns the empty fallback when a feed cannot be fetched', async () => {
    (guardedFetch as jest.Mock).mockRejectedValue(new Error('network down'));

    const result = await source.resolve(ctx);

    expect(result).toMatchObject({
      today: '2026-08-01',
      today_label: 'Saturday, August 1, 2026',
      now_label: '10:15',
      days_ahead: 14,
      fetched_at: '2026-08-01T08:15:00.000Z',
      sources: ['https://feeds.example/cal.ics'],
      events: [],
    });
  });
});
