/**
 * Calendar-date maths in Australia/Sydney (ADR-07).
 * Dates are ISO calendar strings (YYYY-MM-DD); we never do maths on local Date objects.
 */
export type IsoDate = string;

const SYDNEY = 'Australia/Sydney';
const DAY_MS = 86_400_000;

const sydneyParts = new Intl.DateTimeFormat('en-AU', {
  timeZone: SYDNEY,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));

export function todayInSydney(now: Date = new Date()): IsoDate {
  const parts = Object.fromEntries(sydneyParts.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parse(iso: IsoDate): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Not an ISO date: ${iso}`);
  return [y, m, d];
}

function toDayNumber(iso: IsoDate): number {
  const [y, m, d] = parse(iso);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function countdownText(target: IsoDate, today: IsoDate): string {
  const n = daysBetween(today, target);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export type DateStyle = 'long' | 'short' | 'stamp';

export function formatDate(iso: IsoDate, style: DateStyle = 'short'): string {
  const [y, m, d] = parse(iso);
  if (style === 'stamp') return `${d}.${m}.${String(y).slice(2)}`;
  const month = style === 'long' ? MONTHS_LONG[m - 1] : MONTHS_SHORT[m - 1];
  return `${d} ${month} ${y}`;
}

/** Sydney calendar days since an ISO timestamp. */
export function daysSince(isoDateTime: string, now: Date = new Date()): number {
  return daysBetween(todayInSydney(new Date(isoDateTime)), todayInSydney(now));
}

export const STALE_AFTER_DAYS = 3;

export function isStale(lastChecked: string, now: Date = new Date(), maxDays = STALE_AFTER_DAYS): boolean {
  return daysSince(lastChecked, now) > maxDays;
}
