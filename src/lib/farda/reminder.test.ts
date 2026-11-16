import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_REMINDER,
  cleanDayList,
  cleanReminder,
  localStamp,
  pendingDay,
  recentDays,
  snoozeAtTime,
  snoozeTomorrow,
  type ReminderSettings,
} from "./reminder.ts";

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute); // Nov 2026, local time
const none = new Set<string>();
const base = { reminder: DEFAULT_REMINDER, trackingSince: "2026-11-10", expenseDays: none, reviewedDays: none };
const ask = (now: Date, over: Partial<Parameters<typeof pendingDay>[0]> = {}) => pendingDay({ ...base, now, ...over });

describe("pending reminder day", () => {
  it("waits for the reminder time", () => {
    assert.equal(ask(at(15, 20, 59), { trackingSince: "2026-11-15" }), null);
    assert.equal(ask(at(15, 21, 0), { trackingSince: "2026-11-15" }), "2026-11-15");
    assert.equal(ask(at(15, 23, 59), { trackingSince: "2026-11-15" }), "2026-11-15");
  });

  it("stops once the day has an expense or was reviewed", () => {
    const now = at(15, 22);
    const options = { trackingSince: "2026-11-15" };
    assert.equal(ask(now, { ...options, expenseDays: new Set(["2026-11-15"]) }), null);
    assert.equal(ask(now, { ...options, reviewedDays: new Set(["2026-11-15"]) }), null);
  });

  it("asks about a missed evening the next morning, oldest first", () => {
    const morning = at(16, 8);
    assert.equal(ask(morning, { trackingSince: "2026-11-15" }), "2026-11-15");
    assert.equal(ask(at(16, 22), { trackingSince: "2026-11-15" }), "2026-11-15", "yesterday before today");
    assert.equal(
      ask(at(16, 22), { trackingSince: "2026-11-15", reviewedDays: new Set(["2026-11-15"]) }),
      "2026-11-16",
    );
  });

  it("never asks about days before the app was first used", () => {
    assert.equal(ask(at(15, 8), { trackingSince: "2026-11-15" }), null);
    assert.equal(ask(at(15, 22), { trackingSince: null }) !== null, true);
  });

  it("only looks back a few days", () => {
    assert.equal(ask(at(15, 8), { trackingSince: "2026-10-01" }), "2026-11-12");
  });

  it("is silent when disabled", () => {
    assert.equal(ask(at(15, 22), { reminder: { ...DEFAULT_REMINDER, enabled: false } }), null);
  });

  it("honours a snooze until the given moment", () => {
    const reminder: ReminderSettings = { ...DEFAULT_REMINDER, snoozedUntil: "2026-11-16T21:00" };
    assert.equal(ask(at(15, 22), { reminder }), null);
    assert.equal(ask(at(16, 20, 59), { reminder }), null);
    assert.notEqual(ask(at(16, 21, 0), { reminder }), null);
  });
});

describe("snoozing", () => {
  it("snoozes to tomorrow at the reminder time", () => {
    assert.equal(snoozeTomorrow(at(15, 22), "21:00"), "2026-11-16T21:00");
    assert.equal(snoozeTomorrow(new Date(2026, 10, 30, 22), "21:00"), "2026-12-01T21:00");
  });

  it("snoozes to a chosen time today if it is still ahead, otherwise tomorrow", () => {
    assert.equal(snoozeAtTime(at(15, 21, 10), "23:30"), "2026-11-15T23:30");
    assert.equal(snoozeAtTime(at(15, 21, 10), "21:10"), "2026-11-16T21:10");
    assert.equal(snoozeAtTime(at(15, 21, 10), "08:00"), "2026-11-16T08:00");
  });

  it("lists recent days, today first", () => {
    assert.deepEqual(recentDays(at(15, 9), 3), ["2026-11-15", "2026-11-14", "2026-11-13"]);
    assert.equal(localStamp(at(5, 7, 5)), "2026-11-05T07:05");
  });
});

describe("cleaning stored settings", () => {
  it("falls back to defaults for junk and keeps valid values", () => {
    assert.deepEqual(cleanReminder(undefined), DEFAULT_REMINDER);
    assert.deepEqual(cleanReminder({ enabled: false, time: "7:5", snoozedUntil: "soon" }), {
      enabled: false,
      time: "21:00",
      snoozedUntil: null,
    });
    assert.deepEqual(cleanReminder({ enabled: true, time: "08:30", snoozedUntil: "2026-11-16T08:30" }), {
      enabled: true,
      time: "08:30",
      snoozedUntil: "2026-11-16T08:30",
    });
  });

  it("cleans reviewed days", () => {
    assert.deepEqual(cleanDayList(["2026-11-15", "bad", "2026-11-14", "2026-11-15"]), ["2026-11-14", "2026-11-15"]);
    assert.deepEqual(cleanDayList("x"), []);
  });
});
