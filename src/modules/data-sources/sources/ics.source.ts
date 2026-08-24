import { Injectable, Logger } from '@nestjs/common';
import ical, { type CalendarResponse, type EventInstance, type ParameterValue } from 'node-ical';
import { z } from 'zod';

import type { DataSourceContext, DataSourceHandler } from '../data-sources.service';
import { guardedFetch } from '../http/guarded-fetch';
import { dateStringAt, formatWithOffset, localDateString, timeLabelAt, todayLabel, utcFromLocal } from '../timezone';

const DEFAULT_DAYS_AHEAD = 14;
const MAX_DAYS_AHEAD = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

interface FeedSpec {
  url: string;
  color: string | null;
}

export interface CalendarEventOutput {
  title: string;
  location: string | null;
  description: string | null;
  status: string | null;
  url: string | null;
  uid: string | null;
  recurring: boolean;
  color: string | null;
  all_day: boolean;
  day_label: string;
  start: string | null;
  end: string | null;
  time_label: string;
  end_time_label: string | null;
}

function normalizeText(value: ParameterValue | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.val;
}

function isAllowedFeedUrl(url: string): boolean {
  if (/^https:\/\//i.test(url)) {
    return true;
  }
  return process.env.NODE_ENV !== 'production' && /^http:\/\/127\.0\.0\.1(?::\d+)?\//i.test(url);
}

@Injectable()
export class IcsSource implements DataSourceHandler {
  readonly type = 'ics';

  private readonly logger = new Logger(IcsSource.name);

  async resolve(ctx: DataSourceContext): Promise<Record<string, unknown>> {
    const feeds = this.resolveUrls(ctx);
    const daysAhead = this.resolveDaysAhead(ctx);
    const now = new Date();
    const events: CalendarEventOutput[] = [];

    const base = {
      today: ctx.today,
      today_label: todayLabel(ctx.timeZoneIana, now),
      now_label: timeLabelAt(ctx.timeZoneIana, now),
      days_ahead: daysAhead,
      fetched_at: now.toISOString(),
      sources: feeds.map(feed => feed.url),
      events,
    };

    if (feeds.length === 0) {
      return base;
    }

    const [todayYear, todayMonth, todayDay] = ctx.today.split('-').map(Number);
    const windowStart = utcFromLocal(ctx.timeZoneIana, todayYear, todayMonth, todayDay);
    const windowEnd = utcFromLocal(ctx.timeZoneIana, todayYear, todayMonth, todayDay + daysAhead);
    const todayPlus = dateStringAt(ctx.timeZoneIana, windowEnd);

    for (const feed of feeds) {
      try {
        const text = await guardedFetch(feed.url);
        const calendar = ical.parseICS(text);
        events.push(...this.extractEvents(calendar, ctx, windowStart, windowEnd, todayPlus, feed.color));
      } catch (error: unknown) {
        this.logger.warn(`Failed to load ICS feed "${feed.url}" - using empty fallback`, error);
      }
    }

    events.sort((a, b) => a.day_label.localeCompare(b.day_label) || a.time_label.localeCompare(b.time_label));

    return { ...base, events };
  }

  private resolveUrls(ctx: DataSourceContext): FeedSpec[] {
    const urlsField = z.string().optional().parse(ctx.manifestConfig['urls_field']);
    const raw = urlsField ? ctx.configJson[urlsField] : undefined;
    if (!Array.isArray(raw)) {
      return [];
    }

    const feeds: FeedSpec[] = [];
    for (const entry of raw) {
      if (typeof entry === 'string') {
        feeds.push({ url: entry, color: null });
        continue;
      }
      const obj = z.object({ url: z.string(), color: z.string().optional() }).passthrough().safeParse(entry);
      if (obj.success) {
        feeds.push({ url: obj.data.url, color: obj.data.color ?? null });
      }
    }
    return feeds.filter(feed => isAllowedFeedUrl(feed.url));
  }

  private resolveDaysAhead(ctx: DataSourceContext): number {
    const daysAheadField = z.string().optional().parse(ctx.manifestConfig['days_ahead_field']);
    const raw = daysAheadField ? ctx.configJson[daysAheadField] : undefined;
    const value = z.number().optional().parse(raw) ?? DEFAULT_DAYS_AHEAD;
    return Math.min(Math.max(Math.round(value), 1), MAX_DAYS_AHEAD);
  }

  private extractEvents(
    calendar: CalendarResponse,
    ctx: DataSourceContext,
    windowStart: Date,
    windowEnd: Date,
    todayPlus: string,
    feedColor: string | null
  ): CalendarEventOutput[] {
    const events: CalendarEventOutput[] = [];

    for (const uid of Object.keys(calendar)) {
      const component = calendar[uid];
      if (component?.type !== 'VEVENT') {
        continue;
      }
      if (component.status === 'CANCELLED') {
        continue;
      }

      let instances: EventInstance[];
      try {
        instances = ical.expandRecurringEvent(component, {
          from: windowStart,
          to: new Date(windowEnd.getTime() + DAY_MS),
          expandOngoing: true,
        });
      } catch (error: unknown) {
        this.logger.warn(`Failed to expand recurring event "${uid}"`, error);
        continue;
      }

      for (const instance of instances) {
        const output = this.toOutputEvent(instance, ctx, todayPlus, feedColor);
        if (output) {
          events.push(output);
        }
      }
    }

    return events;
  }

  private toOutputEvent(
    instance: EventInstance,
    ctx: DataSourceContext,
    todayPlus: string,
    feedColor: string | null
  ): CalendarEventOutput | null {
    const allDay = instance.isFullDay;
    const title = normalizeText(instance.summary) ?? '';
    const location = normalizeText(instance.event?.location);

    const dayKey = allDay ? localDateString(instance.start) : dateStringAt(ctx.timeZoneIana, instance.start);
    const clampedDay = dayKey < ctx.today ? ctx.today : dayKey;
    if (clampedDay >= todayPlus) {
      return null;
    }

    const shared: Omit<CalendarEventOutput, 'all_day' | 'start' | 'end' | 'time_label' | 'end_time_label'> = {
      title,
      location,
      description: normalizeText(instance.event?.description),
      status: instance.event?.status ?? null,
      url: instance.event?.url ?? null,
      uid: instance.event?.uid ?? null,
      recurring: instance.isRecurring,
      color: feedColor,
      day_label: clampedDay,
    };

    if (allDay) {
      const [year, month, day] = clampedDay.split('-').map(Number);
      return {
        ...shared,
        all_day: true,
        start: formatWithOffset(ctx.timeZoneIana, utcFromLocal(ctx.timeZoneIana, year, month, day)),
        end: formatWithOffset(ctx.timeZoneIana, utcFromLocal(ctx.timeZoneIana, year, month, day + 1)),
        time_label: '',
        end_time_label: null,
      };
    }

    const end = instance.end instanceof Date ? instance.end : null;
    return {
      ...shared,
      all_day: false,
      start: formatWithOffset(ctx.timeZoneIana, instance.start),
      end: end ? formatWithOffset(ctx.timeZoneIana, end) : null,
      time_label: timeLabelAt(ctx.timeZoneIana, instance.start),
      end_time_label: end ? timeLabelAt(ctx.timeZoneIana, end) : null,
    };
  }
}
