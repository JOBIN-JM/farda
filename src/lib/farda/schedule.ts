import { WEEKDAY_NAMES, dayDiff, isDayKey, weekdayOf, type DayKey } from "./calendar.ts";

/** How often a basket item is consumed. Weekdays use 0 = Saturday … 6 = Friday. */
export type Recurrence =
  | { kind: "weekdays"; days: number[] }
  | { kind: "every-n-days"; n: number; anchor: DayKey }
  | { kind: "monthly"; dayOfMonth: number };

export type Schedule = {
  recurrence: Recurrence;
  /** Quantity per occurrence, in the item's consumption unit (eggs, grams, ml). */
  qty: number;
  /** Reserved for different quantities on different weekdays; wins over `qty` when set. */
  qtyByWeekday?: Partial<Record<number, number>>;
  /** Days the item is skipped even though the rule says otherwise. */
  skips?: DayKey[];
  /** One-off extra days on top of the rule. */
  extras?: DayKey[];
};

const MAX_QTY = 99_999;
const MAX_EXCEPTIONS = 200;
const MAX_INTERVAL = 365;

function ruleMatches(recurrence: Recurrence, day: DayKey, monthDays: DayKey[]): boolean {
  switch (recurrence.kind) {
    case "weekdays":
      return recurrence.days.includes(weekdayOf(day));
    case "every-n-days":
      // Aligned to the anchor in both directions, so every month follows the same rhythm.
      return dayDiff(day, recurrence.anchor) % recurrence.n === 0;
    case "monthly": {
      // A "31st" lands on the last day of shorter months.
      const target = Math.min(recurrence.dayOfMonth, monthDays.length);
      return monthDays[target - 1] === day;
    }
  }
}

/** The days of this month the item is consumed, rule + one-offs − skips. */
export function scheduledDays(schedule: Schedule, monthDays: DayKey[]): DayKey[] {
  const skips = new Set(schedule.skips);
  const extras = new Set(schedule.extras);
  return monthDays.filter(
    (day) => !skips.has(day) && (extras.has(day) || ruleMatches(schedule.recurrence, day, monthDays)),
  );
}

/**
 * Flip one day: a day the rule covers becomes a skip (and back), a day it does
 * not cover becomes a one-off extra (and back). Everything else is untouched.
 */
export function toggleDay(schedule: Schedule, day: DayKey, monthDays: DayKey[]): Schedule {
  const byRule = ruleMatches(schedule.recurrence, day, monthDays);
  const skips = new Set(schedule.skips);
  const extras = new Set(schedule.extras);
  const occurs = !skips.has(day) && (extras.has(day) || byRule);
  if (occurs) {
    extras.delete(day);
    if (byRule) skips.add(day);
  } else {
    skips.delete(day);
    if (!byRule) extras.add(day);
  }
  return {
    ...schedule,
    skips: skips.size > 0 ? [...skips].sort() : undefined,
    extras: extras.size > 0 ? [...extras].sort() : undefined,
  };
}

export function qtyOn(schedule: Schedule, day: DayKey): number {
  return schedule.qtyByWeekday?.[weekdayOf(day)] ?? schedule.qty;
}

/** Total quantity consumed over the month. */
export function monthlyCount(schedule: Schedule, monthDays: DayKey[]): number {
  return scheduledDays(schedule, monthDays).reduce((sum, day) => sum + qtyOn(schedule, day), 0);
}

/**
 * Quantity per item for a month, in purchase units. Scheduled items count their
 * occurrences (in consumption units) and convert with `portionsPerUnit`;
 * everything else keeps its fixed monthly quantity.
 */
export function monthlyQty(
  qty: Record<string, number>,
  schedules: Record<string, Schedule>,
  monthDays: DayKey[],
  portionsPerUnit: Record<string, number> = {},
): Record<string, number> {
  const result = { ...qty };
  for (const [id, schedule] of Object.entries(schedules)) {
    result[id] = monthlyCount(schedule, monthDays) / (portionsPerUnit[id] || 1);
  }
  return result;
}

const fa = (n: number) => n.toLocaleString("fa-IR");

/** "شنبه، یکشنبه، چهارشنبه · ۲ عدد هر بار" */
export function describeSchedule(schedule: Schedule, portionLabel: string): string {
  const { recurrence } = schedule;
  let when: string;
  if (recurrence.kind === "weekdays") {
    when = recurrence.days.length === 7 ? "هر روز" : recurrence.days.map((d) => WEEKDAY_NAMES[d]).join("، ");
  } else if (recurrence.kind === "every-n-days") {
    when = recurrence.n === 1 ? "هر روز" : `هر ${fa(recurrence.n)} روز`;
  } else {
    when = `ماهی یک‌بار، روز ${fa(recurrence.dayOfMonth)}`;
  }
  return `${when} · ${fa(schedule.qty)} ${portionLabel} هر بار`;
}

function wholeNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

function cleanDays(raw: unknown): DayKey[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  // Keep the most recent exceptions if there are ever too many.
  const days = [...new Set(raw.filter(isDayKey))].sort().slice(-MAX_EXCEPTIONS);
  return days.length > 0 ? days : undefined;
}

function cleanRecurrence(raw: unknown): Recurrence | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.kind === "weekdays" && Array.isArray(value.days)) {
    const days = [...new Set(value.days.filter((d) => wholeNumber(d, 0, 6) !== null))].sort() as number[];
    return days.length > 0 ? { kind: "weekdays", days } : null;
  }
  if (value.kind === "every-n-days") {
    const n = wholeNumber(value.n, 1, MAX_INTERVAL);
    return n !== null && isDayKey(value.anchor) ? { kind: "every-n-days", n, anchor: value.anchor } : null;
  }
  if (value.kind === "monthly") {
    const dayOfMonth = wholeNumber(value.dayOfMonth, 1, 31);
    return dayOfMonth !== null ? { kind: "monthly", dayOfMonth } : null;
  }
  return null;
}

/** Validate untrusted data (storage, forms) into a Schedule, or null. */
export function cleanSchedule(raw: unknown): Schedule | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const recurrence = cleanRecurrence(value.recurrence);
  const qty = wholeNumber(value.qty, 0, MAX_QTY);
  if (!recurrence || qty === null) return null;

  const schedule: Schedule = { recurrence, qty };
  if (value.qtyByWeekday && typeof value.qtyByWeekday === "object") {
    const byWeekday: Partial<Record<number, number>> = {};
    for (const [key, amount] of Object.entries(value.qtyByWeekday)) {
      const weekday = wholeNumber(Number(key), 0, 6);
      const count = wholeNumber(amount, 0, MAX_QTY);
      if (weekday !== null && count !== null) byWeekday[weekday] = count;
    }
    if (Object.keys(byWeekday).length > 0) schedule.qtyByWeekday = byWeekday;
  }
  const skips = cleanDays(value.skips);
  const extras = cleanDays(value.extras);
  if (skips) schedule.skips = skips;
  if (extras) schedule.extras = extras;
  return schedule;
}
