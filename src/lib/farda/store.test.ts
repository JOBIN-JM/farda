import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { basketTotal, categoryTotals, portionsPerUnit } from "./catalog.ts";
import { monthDaysOfKey } from "./calendar.ts";
import { monthlyQty, type Schedule } from "./schedule.ts";
import { resolveItems, visibleItems } from "./items.ts";
import { usePlan } from "./store.ts";

const state = () => usePlan.getState();
const merge = (persisted: unknown) => usePlan.persist.getOptions().merge!(persisted, state()) as ReturnType<typeof state>;
const weekly: Schedule = { qty: 1, recurrence: { kind: "weekdays", days: [0, 2] } };

beforeEach(() => state().reset());

describe("hiding built-in items", () => {
  it("hides, shows and ignores custom or unknown ids", () => {
    state().hideItem("eggs");
    state().hideItem("eggs");
    state().hideItem("custom-x");
    state().hideItem("nope");
    assert.deepEqual(state().hiddenItems, ["eggs"]);
    state().showItem("eggs");
    assert.deepEqual(state().hiddenItems, []);
  });

  it("keeps quantity, schedule and price so showing again restores everything", () => {
    state().setQty("milk", 3);
    state().setPrice("milk", 123_000);
    state().setSchedule("eggs", weekly);
    const before = { qty: state().qty, schedules: state().schedules, priceOverrides: state().priceOverrides };
    state().hideItem("milk");
    state().hideItem("eggs");
    assert.deepEqual(
      { qty: state().qty, schedules: state().schedules, priceOverrides: state().priceOverrides },
      before,
    );
    state().showItem("milk");
    state().showItem("eggs");
    assert.deepEqual(
      { qty: state().qty, schedules: state().schedules, priceOverrides: state().priceOverrides },
      before,
    );
  });

  it("takes the item out of the basket total and category totals only while hidden", () => {
    state().setQty("milk", 2);
    const items = resolveItems(state().customItems, state().itemEdits);
    const days = monthDaysOfKey("1405-08");
    const monthly = () => monthlyQty(state().qty, state().schedules, days, portionsPerUnit(items));
    const total = (hidden: string[]) =>
      basketTotal(monthly(), state().priceOverrides, undefined, visibleItems(items, hidden));
    const withMilk = total([]);
    assert.ok(withMilk > 0);
    assert.equal(total(["milk"]), withMilk - basketTotal({ milk: 2 }));
    const dairy = (hidden: string[]) =>
      categoryTotals(monthly(), {}, {}, visibleItems(items, hidden)).find((c) => c.id === "dairy")?.total ?? 0;
    assert.equal(dairy(["milk"]), dairy([]) - basketTotal({ milk: 2 }));
    assert.equal(total([]), withMilk);
  });

  it("recordMonth leaves a hidden item out of the saved basket", () => {
    state().setQty("milk", 2);
    state().recordMonth("1405-08");
    const full = state().history["1405-08"].basket;
    state().hideItem("milk");
    state().recordMonth("1405-08");
    assert.equal(state().history["1405-08"].basket, full - basketTotal({ milk: 2 }));
    state().showItem("milk");
    state().recordMonth("1405-08");
    assert.equal(state().history["1405-08"].basket, full);
  });

  it("is persisted and cleaned on load without losing a hidden item's schedule or price", () => {
    const saved = {
      hiddenItems: ["eggs", "eggs", "bogus", "custom-x", 7],
      schedules: { eggs: weekly },
      priceOverrides: { eggs: 777_000 },
      qty: { eggs: 1 },
    };
    const merged = merge(saved);
    assert.deepEqual(merged.hiddenItems, ["eggs"]);
    assert.deepEqual(merged.schedules.eggs, weekly);
    assert.equal(merged.priceOverrides.eggs, 777_000);
    assert.deepEqual(merge({}).hiddenItems, []);
    assert.deepEqual(merge({ hiddenItems: "eggs" }).hiddenItems, []);
    const options = usePlan.persist.getOptions();
    const stored = options.partialize!(state()) as Record<string, unknown>;
    assert.ok("hiddenItems" in stored);
  });

  it("is cleared by reset but the price feed stays", () => {
    state().hideItem("eggs");
    state().applyFeed({ asOf: "2026-11-14", prices: { milk: 150_000 } } as never);
    state().reset();
    assert.deepEqual(state().hiddenItems, []);
    assert.equal(state().feed?.prices.milk, 150_000);
  });
});

describe("updateExpense with a day", () => {
  const add = (day: string, amount: number) => {
    const before = new Set(state().expenses.map((e) => e.id));
    state().addExpense({ day, amount });
    return state().expenses.find((e) => !before.has(e.id))!.id;
  };

  it("moves an expense and keeps the list sorted by day", () => {
    const a = add("2026-11-10", 100);
    add("2026-11-12", 200);
    state().updateExpense(a, { day: "2026-11-15" });
    assert.deepEqual(state().expenses.map((e) => e.day), ["2026-11-12", "2026-11-15"]);
    assert.equal(state().expenses[1].id, a);
  });

  it("rejects an invalid day and leaves the expense alone", () => {
    const a = add("2026-11-10", 100);
    state().updateExpense(a, { day: "2026-02-31" });
    state().updateExpense(a, { day: "x" });
    assert.equal(state().expenses[0].day, "2026-11-10");
  });

  it("can move an expense into another Persian month", () => {
    const a = add("2026-11-10", 100); // 1405-08
    state().updateExpense(a, { day: "2026-12-05" }); // 1405-09
    assert.equal(state().expenses[0].day, "2026-12-05");
    assert.equal(state().expenses[0].amount, 100);
  });
});
