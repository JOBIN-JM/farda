/**
 * Persian-calendar helpers. Days are stored as Gregorian ISO keys ("2026-11-14")
 * because those are unambiguous; the Persian date is derived with `Intl` only
 * when needed, so month lengths and leap years are never hand-rolled.
 */
export type DayKey = string;

export type JalaliDate = { year: number; month: number; day: number };

/** Persian week order, index = `weekdayOf`. */
export const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAY_LETTERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const DAY_MS = 86_400_000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const jalaliFormat = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

const pad = (n: number) => String(n).padStart(2, "0");

function toDate(key: DayKey): Date {
  return new Date(`${key}T12:00:00Z`);
}

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !DAY_KEY.test(value)) return false;
  const date = toDate(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** The device's current local day. */
export function todayKey(now = new Date()): DayKey {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(key: DayKey, n: number): DayKey {
  const date = toDate(key);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `b` to `a` (positive when `a` is later). */
export function dayDiff(a: DayKey, b: DayKey): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY_MS);
}

/** 0 = Saturday … 6 = Friday, the order of the Persian week. */
export function weekdayOf(key: DayKey): number {
  return (toDate(key).getUTCDay() + 1) % 7;
}

export function jalaliOf(key: DayKey): JalaliDate {
  const parts = jalaliFormat.formatToParts(toDate(key));
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

/** "1405-08" — same shape as `persianMonthKey`. */
export function monthKeyOf(key: DayKey): string {
  const { year, month } = jalaliOf(key);
  return `${year}-${pad(month)}`;
}

function monthOrdinal(key: DayKey): number {
  const { year, month } = jalaliOf(key);
  return year * 12 + month - 1;
}

function firstDayOfMonth(year: number, month: number): DayKey {
  const target = year * 12 + month - 1;
  // Nowruz falls on 20–22 March and months are ~30.4 days: the estimate is off by a few days at most.
  let key = addDays(`${year + 621}-03-21`, Math.round((month - 1) * 30.4));
  while (monthOrdinal(key) > target) key = addDays(key, -1);
  while (monthOrdinal(key) < target) key = addDays(key, 1);
  while (jalaliOf(key).day !== 1) key = addDays(key, -1);
  return key;
}

/** Every day of a Persian month, in order. */
export function monthDays(year: number, month: number): DayKey[] {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return [];
  const days: DayKey[] = [];
  let key = firstDayOfMonth(year, month);
  while (jalaliOf(key).month === month) {
    days.push(key);
    key = addDays(key, 1);
  }
  return days;
}

/** Days of the month named by a "1405-08" key; empty for a malformed key. */
export function monthDaysOfKey(monthKey: string): DayKey[] {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  return match ? monthDays(Number(match[1]), Number(match[2])) : [];
}

/** Move a "1405-08" key by whole months ("1405-12" + 1 = "1406-01"). */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const ordinal = Number(match[1]) * 12 + Number(match[2]) - 1 + delta;
  return `${Math.floor(ordinal / 12)}-${pad((ordinal % 12) + 1)}`;
}
