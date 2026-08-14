interface TzParts {
  y: string;
  m: string;
  d: string;
  h: string;
  min: string;
  s: string;
}

function tzPartsAt(timeZone: string, date: Date): TzParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string): string => parts.find(part => part.type === type)?.value ?? '';
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') };
}

export function dateStringAt(timeZone: string, date: Date): string {
  const { y, m, d } = tzPartsAt(timeZone, date);
  return `${y}-${m}-${d}`;
}

export function timeLabelAt(timeZone: string, date: Date): string {
  const { h, min } = tzPartsAt(timeZone, date);
  return `${h}:${min}`;
}

export function todayLabel(timeZone: string, date: Date): string {
  return new Intl.DateTimeFormat('en', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function tzOffsetMinutes(timeZone: string, date: Date): number {
  const { y, m, d, h, min, s } = tzPartsAt(timeZone, date);
  const asUtc = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
  return (asUtc - date.getTime()) / 60_000;
}

export function tzOffsetString(timeZone: string, date: Date): string {
  const offset = tzOffsetMinutes(timeZone, date);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

export function formatWithOffset(timeZone: string, date: Date): string {
  const { y, m, d, h, min, s } = tzPartsAt(timeZone, date);
  return `${y}-${m}-${d}T${h}:${min}:${s}${tzOffsetString(timeZone, date)}`;
}

export function utcFromLocal(timeZone: string, year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const approxOffsetMs = tzOffsetMinutes(timeZone, new Date(year, month - 1, day, hour, minute)) * 60_000;
  const firstGuess = new Date(Date.UTC(year, month - 1, day, hour, minute) - approxOffsetMs);
  const secondOffsetMs = tzOffsetMinutes(timeZone, firstGuess) * 60_000;
  return secondOffsetMs === approxOffsetMs
    ? firstGuess
    : new Date(Date.UTC(year, month - 1, day, hour, minute) - secondOffsetMs);
}

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
