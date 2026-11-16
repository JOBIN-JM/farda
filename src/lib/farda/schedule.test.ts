import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dayDiff,
  isDayKey,
  jalaliOf,
  monthDays,
  monthDaysOfKey,
  monthKeyOf,
  shiftMonthKey,
  todayKey,
  weekdayOf,
} from "./calendar.ts";
import { CATALOG, PORTIONS_PER_UNIT, basketTotal } from "./catalog.ts";
import { formatDayLabel, persianMonthKey } from "./format.ts";
import {
  cleanSchedule,
  describeSchedule,
  monthlyCount,
  monthlyQty,
  qtyOn,
  scheduledDays,
  toggleDay,
  type Schedule,
} from "./schedule.ts";

// Aban 1405: Fri 2026-10-23 … Sat 2026-11-21 (30 days, so Friday and Saturday occur 5 times).
const aban = monthDaysOfKey("1405-08");

describe("persian calendar", () => {
  it("converts day keys to Persian dates", () => {
    assert.deepEqual(jalaliOf("2026-03-21"), { year: 1405, month: 1, day: 1 });
    assert.deepEqual(jalaliOf("2026-11-14"), { year: 1405, month: 8, day: 23 });
    assert.equal(monthKeyOf("2026-11-14"), "1405-08");
    assert.equal(monthKeyOf("2026-11-14"), persianMonthKey(new Date("2026-11-14T12:00:00Z")));
  });

  it("knows month lengths and leap years", () => {
    const lengths = (year: number) => Array.from({ length: 12 }, (_, i) => monthDays(year, i + 1).length);
    assert.deepEqual(lengths(1405), [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]);
    assert.equal(monthDays(1403, 12).length, 30, "1403 is a leap year");
    assert.equal(monthDays(1404, 12).length, 29);
  });

  it("lists consecutive days of a month", () => {
    assert.equal(aban.length, 30);
    assert.equal(aban[0], "2026-10-23");
    assert.equal(aban[29], "2026-11-21");
    assert.deepEqual(monthDaysOfKey("bad"), []);
    assert.deepEqual(monthDays(1405, 13), []);
  });

  it("handles day arithmetic and Persian weekdays", () => {
    assert.equal(weekdayOf("2026-11-14"), 0, "Saturday");
    assert.equal(weekdayOf("2026-11-15"), 1, "Sunday");
    assert.equal(weekdayOf("2026-11-20"), 6, "Friday");
    assert.equal(addDays("2026-02-28", 1), "2026-03-01");
    assert.equal(dayDiff("2026-11-15", "2026-11-10"), 5);
    assert.equal(todayKey(new Date(2026, 10, 15, 23, 30)), "2026-11-15");
  });

  it("validates day keys", () => {
    assert.equal(isDayKey("2026-11-14"), true);
    assert.equal(isDayKey("2026-02-31"), false);
    assert.equal(isDayKey("14 Nov"), false);
    assert.equal(isDayKey(20261114), false);
  });
});

describe("recurring schedules", () => {
  const eggs: Schedule = { recurrence: { kind: "weekdays", days: [0, 1, 4] }, qty: 1 };

  it("counts Saturday, Sunday and Wednesday over a month", () => {
    // Sat ×5 + Sun ×4 + Wed ×4
    assert.equal(monthlyCount(eggs, aban), 13);
    assert.equal(monthlyCount({ ...eggs, qty: 2 }, aban), 26);
  });

  it("repeats every N days, aligned to the anchor", () => {
    const every3: Schedule = { recurrence: { kind: "every-n-days", n: 3, anchor: aban[0] }, qty: 1 };
    assert.equal(monthlyCount(every3, aban), 10);
    const shifted: Schedule = { recurrence: { kind: "every-n-days", n: 3, anchor: "2026-01-02" }, qty: 1 };
    assert.equal(scheduledDays(shifted, aban).every((d) => dayDiff(d, "2026-01-02") % 3 === 0), true);
  });

  it("places a monthly item on its day, clamped to short months", () => {
    const monthly = (dayOfMonth: number): Schedule => ({ recurrence: { kind: "monthly", dayOfMonth }, qty: 1 });
    assert.deepEqual(scheduledDays(monthly(5), aban), [aban[4]]);
    assert.deepEqual(scheduledDays(monthly(31), aban), [aban[29]]);
    const esfand = monthDays(1404, 12);
    assert.deepEqual(scheduledDays(monthly(30), esfand), [esfand[28]]);
  });

  it("applies skips and one-off extras", () => {
    const withExceptions: Schedule = { ...eggs, skips: ["2026-10-24"], extras: ["2026-10-27", "2099-01-01"] };
    // 13 − the skipped Saturday + an extra Tuesday (not in the rule); days outside the month are ignored.
    assert.equal(monthlyCount(withExceptions, aban), 13);
    assert.equal(scheduledDays(withExceptions, aban).includes("2026-10-24"), false);
    assert.equal(scheduledDays(withExceptions, aban).includes("2026-10-27"), true);
  });

  it("leaves room for different quantities per weekday", () => {
    const schedule: Schedule = { ...eggs, qtyByWeekday: { 4: 3 } };
    assert.equal(qtyOn(schedule, "2026-11-14"), 1);
    assert.equal(qtyOn(schedule, "2026-11-18"), 3, "Wednesday");
    assert.equal(monthlyCount(schedule, aban), 5 + 4 + 4 * 3);
  });

  it("swaps fixed quantities for scheduled counts", () => {
    assert.deepEqual(monthlyQty({ eggs: 2, milk: 4 }, { eggs }, aban), { eggs: 13, milk: 4 });
    assert.deepEqual(monthlyQty({ eggs: 2 }, {}, aban), { eggs: 2 });
  });
});

describe("cleanSchedule", () => {
  it("accepts a valid schedule and normalises it", () => {
    assert.deepEqual(cleanSchedule({ recurrence: { kind: "weekdays", days: [4, 0, 0, 9] }, qty: 2 }), {
      recurrence: { kind: "weekdays", days: [0, 4] },
      qty: 2,
    });
  });

  it("rejects malformed data", () => {
    assert.equal(cleanSchedule(null), null);
    assert.equal(cleanSchedule({ recurrence: { kind: "weekdays", days: [] }, qty: 1 }), null);
    assert.equal(cleanSchedule({ recurrence: { kind: "weekdays", days: [1] }, qty: -1 }), null);
    assert.equal(cleanSchedule({ recurrence: { kind: "weekdays", days: [1] }, qty: 1.5 }), null);
    assert.equal(cleanSchedule({ recurrence: { kind: "every-n-days", n: 0, anchor: "2026-11-14" }, qty: 1 }), null);
    assert.equal(cleanSchedule({ recurrence: { kind: "every-n-days", n: 3, anchor: "nope" }, qty: 1 }), null);
    assert.equal(cleanSchedule({ recurrence: { kind: "monthly", dayOfMonth: 32 }, qty: 1 }), null);
    assert.equal(cleanSchedule({ recurrence: { kind: "yearly" }, qty: 1 }), null);
  });

  it("drops invalid exception dates", () => {
    const clean = cleanSchedule({
      recurrence: { kind: "monthly", dayOfMonth: 1 },
      qty: 1,
      skips: ["2026-11-14", "bad", "2026-11-14"],
    });
    assert.deepEqual(clean?.skips, ["2026-11-14"]);
    assert.equal(clean?.extras, undefined);
  });
});

describe("consumption units", () => {
  const eggs: Schedule = { recurrence: { kind: "weekdays", days: [0, 1, 4] }, qty: 2 };

  it("converts eggs eaten per day into trays bought", () => {
    // 13 occurrences × 2 eggs = 26 eggs = 26/30 of a 30-egg tray
    const monthly = monthlyQty({ eggs: 2 }, { eggs }, aban, PORTIONS_PER_UNIT);
    assert.ok(Math.abs(monthly.eggs - 26 / 30) < 1e-9);
    assert.equal(basketTotal(monthly), Math.round((26 / 30) * 550_000));
  });

  it("keeps whole-unit items exact and rounds only the final total", () => {
    assert.equal(basketTotal({ milk: 8 }), 8 * 140_000);
    assert.equal(basketTotal({ eggs: 1 / 3 }), Math.round(550_000 / 3));
  });

  it("gives every consumable a portion and no service one", () => {
    for (const item of CATALOG) {
      if (item.category === "service") assert.equal(item.portion, undefined, item.id);
      else assert.ok(item.portion && item.portion.perUnit > 0, item.id);
    }
    assert.equal(PORTIONS_PER_UNIT.eggs, 30);
    assert.equal(PORTIONS_PER_UNIT["rice-ir"], 1000);
    assert.equal(PORTIONS_PER_UNIT["net-5"], undefined);
  });

  it("accepts gram-sized quantities", () => {
    assert.equal(cleanSchedule({ recurrence: { kind: "monthly", dayOfMonth: 1 }, qty: 250 })?.qty, 250);
    assert.equal(cleanSchedule({ recurrence: { kind: "monthly", dayOfMonth: 1 }, qty: 100_000 }), null);
  });

  it("describes a schedule in words", () => {
    assert.equal(describeSchedule(eggs, "عدد"), "شنبه، یکشنبه، چهارشنبه · ۲ عدد هر بار");
    assert.equal(
      describeSchedule({ recurrence: { kind: "every-n-days", n: 3, anchor: "2026-11-14" }, qty: 150 }, "گرم"),
      "هر ۳ روز · ۱۵۰ گرم هر بار",
    );
    assert.equal(
      describeSchedule({ recurrence: { kind: "monthly", dayOfMonth: 5 }, qty: 1 }, "عدد"),
      "ماهی یک‌بار، روز ۵ · ۱ عدد هر بار",
    );
    assert.equal(
      describeSchedule({ recurrence: { kind: "weekdays", days: [0, 1, 2, 3, 4, 5, 6] }, qty: 1 }, "عدد"),
      "هر روز · ۱ عدد هر بار",
    );
  });
});

describe("calendar days", () => {
  const eggs: Schedule = { recurrence: { kind: "weekdays", days: [0, 1, 4] }, qty: 1 };
  const saturday = "2026-10-24";
  const tuesday = "2026-10-27";

  it("skips a day the rule covers and brings it back", () => {
    const skipped = toggleDay(eggs, saturday, aban);
    assert.deepEqual(skipped.skips, [saturday]);
    assert.equal(monthlyCount(skipped, aban), 12);
    const restored = toggleDay(skipped, saturday, aban);
    assert.equal(restored.skips, undefined);
    assert.equal(monthlyCount(restored, aban), 13);
  });

  it("adds a one-off day the rule does not cover and removes it again", () => {
    const added = toggleDay(eggs, tuesday, aban);
    assert.deepEqual(added.extras, [tuesday]);
    assert.equal(monthlyCount(added, aban), 14);
    const removed = toggleDay(added, tuesday, aban);
    assert.equal(removed.extras, undefined);
    assert.equal(monthlyCount(removed, aban), 13);
  });

  it("survives validation unchanged", () => {
    const toggled = toggleDay(toggleDay(eggs, saturday, aban), tuesday, aban);
    assert.deepEqual(cleanSchedule(toggled), { ...eggs, skips: [saturday], extras: [tuesday] });
  });

  it("works for monthly items on a clamped day", () => {
    const monthly: Schedule = { recurrence: { kind: "monthly", dayOfMonth: 31 }, qty: 1 };
    assert.equal(monthlyCount(toggleDay(monthly, aban[29], aban), aban), 0);
  });

  it("moves between months, across the year boundary", () => {
    assert.equal(shiftMonthKey("1405-08", 1), "1405-09");
    assert.equal(shiftMonthKey("1405-12", 1), "1406-01");
    assert.equal(shiftMonthKey("1405-01", -1), "1404-12");
    assert.equal(shiftMonthKey("1405-08", 12), "1406-08");
    assert.equal(shiftMonthKey("bad", 1), "bad");
  });

  it("labels a day for display", () => {
    assert.equal(formatDayLabel("2026-11-14"), "۲۳ آبان · شنبه");
  });
});
