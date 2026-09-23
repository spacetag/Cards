/** How many days before and after today the app lets you scroll to. */
export const DAYS_BEFORE = 730;
export const DAYS_AFTER = 730;
export const DAY_COUNT = DAYS_BEFORE + DAYS_AFTER + 1;
export const TODAY_INDEX = DAYS_BEFORE;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Fixed for the lifetime of the app session so indices stay stable.
const ORIGIN = startOfToday();

/** The calendar date for a pager index (index TODAY_INDEX is today). */
export function dateForIndex(index: number): Date {
  const d = new Date(ORIGIN);
  // setDate handles month/year rollover and DST correctly (unlike adding ms).
  d.setDate(d.getDate() + index - TODAY_INDEX);
  return d;
}

/** Stable storage key for a date, e.g. "2026-09-23". */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const isSunday = (d: Date) => d.getDay() === 0;
export const weekdayName = (d: Date) => WEEKDAYS[d.getDay()];
export const monthName = (d: Date) => MONTHS[d.getMonth()];
export const shortMonth = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);

export function longDate(d: Date): string {
  return `${monthName(d)} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Today", "Yesterday", "Tomorrow", or null. */
export function relativeLabel(index: number): string | null {
  const offset = index - TODAY_INDEX;
  if (offset === 0) return 'Today';
  if (offset === -1) return 'Yesterday';
  if (offset === 1) return 'Tomorrow';
  return null;
}
