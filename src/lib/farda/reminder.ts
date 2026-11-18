import { addDays, isDayKey, todayKey, type DayKey } from "./calendar.ts";

/**
 * In-app reminder to log the day's spending. `snoozedUntil` is a local
 * "YYYY-MM-DDTHH:MM" stamp; stamps and days compare correctly as plain strings.
 */
export type ReminderSettings = {
  enabled: boolean;
  /** "HH:MM", 24-hour, local time. */
  time: string;
  snoozedUntil: string | null;
};

export const DEFAULT_REMINDER: ReminderSettings = { enabled: true, time: "21:00", snoozedUntil: null };

/** How many past days the reminder still asks about. */
export const LOOK_BACK_DAYS = 3;
const MAX_REVIEWED = 90;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const STAMP = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

export const isTime = (value: unknown): value is string => typeof value === "string" && TIME.test(value);

export function cleanReminder(raw: unknown): ReminderSettings {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_REMINDER.enabled,
    time: isTime(value.time) ? value.time : DEFAULT_REMINDER.time,
    snoozedUntil:
      typeof value.snoozedUntil === "string" && STAMP.test(value.snoozedUntil) ? value.snoozedUntil : null,
  };
}

/** Valid, unique, sorted day keys; only the latest are kept. */
export function cleanDayList(raw: unknown): DayKey[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isDayKey))].sort().slice(-MAX_REVIEWED);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-15T21:30" in the device's local time. */
export function localStamp(now: Date): string {
  return `${todayKey(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Today first, then back in time. */
export function recentDays(now: Date, count = 7): DayKey[] {
  const today = todayKey(now);
  return Array.from({ length: count }, (_, i) => addDays(today, -i));
}

/**
 * The day to ask about right now, or null. A day is due once its reminder time
 * has passed, until it has an expense or the user has said it is done. The
 * oldest due day comes first so a missed evening is asked about before today.
 */
export function pendingDay(input: {
  now: Date;
  reminder: ReminderSettings;
  /** The first day the app was used: earlier days are never asked about. */
  trackingSince: DayKey | null;
  expenseDays: ReadonlySet<DayKey>;
  reviewedDays: ReadonlySet<DayKey>;
}): DayKey | null {
  const { now, reminder, trackingSince, expenseDays, reviewedDays } = input;
  if (!reminder.enabled) return null;
  const stamp = localStamp(now);
  if (reminder.snoozedUntil && stamp < reminder.snoozedUntil) return null;

  const today = todayKey(now);
  for (let back = LOOK_BACK_DAYS; back >= 0; back--) {
    const day = addDays(today, -back);
    if (trackingSince && day < trackingSince) continue;
    if (stamp < `${day}T${reminder.time}`) continue;
    if (expenseDays.has(day) || reviewedDays.has(day)) continue;
    return day;
  }
  return null;
}

/** Tomorrow at the reminder time. */
export function snoozeTomorrow(now: Date, time: string): string {
  return `${addDays(todayKey(now), 1)}T${time}`;
}

/** The next time the clock shows `time`: later today if it has not passed, else tomorrow. */
export function snoozeAtTime(now: Date, time: string): string {
  const later = `${todayKey(now)}T${time}`;
  return later > localStamp(now) ? later : snoozeTomorrow(now, time);
}
