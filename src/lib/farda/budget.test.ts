import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDays, monthDays } from "./calendar.ts";
import {
  cleanExpense,
  cleanExpenses,
  expenseDayChoices,
  monthBudgets,
  monthPool,
  patchExpense,
  type Expense,
} from "./budget.ts";

const aban = monthDays(1405, 8); // 30 days
const esfand = monthDays(1404, 12); // 29 days
const spend = (dayIndex: number, amount: number, id = `e${dayIndex}-${amount}`): Expense => ({
  id,
  day: aban[dayIndex],
  amount,
});
const near = (actual: number, expected: number, message = "") =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message} ${actual} ≉ ${expected}`.trim());

describe("month pool", () => {
  it("is budget minus basket minus goal savings", () => {
    assert.equal(monthPool(30_000_000, 12_000_000, 5_000_000), 13_000_000);
    assert.equal(monthPool(10_000_000, 12_000_000, 0), -2_000_000);
  });
});

/** Expenses of someone who spends exactly the day's allowance, except where `override` says otherwise. */
function followAllowance(pool: number, days: string[], override: Record<number, number> = {}): Expense[] {
  const expenses: Expense[] = [];
  for (let i = 0; i < days.length; i++) {
    const allowance = monthBudgets(pool, days, expenses)[i].allowance;
    const amount = override[i] ?? allowance;
    if (amount > 0) expenses.push({ id: `f${i}`, day: days[i], amount });
  }
  return expenses;
}

describe("daily budget", () => {
  it("starts at pool ÷ days of the month", () => {
    near(monthBudgets(3_000_000, aban, [])[0].allowance, 100_000);
    near(monthBudgets(2_900_000, esfand, [])[0].allowance, 100_000);
    assert.equal(monthBudgets(3_000_000, aban, []).length, 30);
  });

  it("stays constant while the allowance is spent exactly", () => {
    const budgets = monthBudgets(3_000_000, aban, followAllowance(3_000_000, aban));
    for (const day of budgets) {
      near(day.allowance, 100_000);
      near(day.remaining, 0);
    }
  });

  it("lets unlogged days flow into later days", () => {
    const budgets = monthBudgets(3_000_000, aban, []);
    near(budgets[1].allowance, 3_000_000 / 29);
    near(budgets[10].allowance, 3_000_000 / 20);
    near(budgets[29].allowance, 3_000_000, "the last day may spend everything still unspent");
  });

  it("carries a small under-spend into the following days", () => {
    const budgets = monthBudgets(3_000_000, aban, [spend(0, 40_000)]);
    near(budgets[0].remaining, 60_000);
    near(budgets[1].allowance, (3_000_000 - 40_000) / 29);
    assert.ok(budgets[1].allowance > 100_000);
  });

  it("shares an over-spend equally among the remaining days", () => {
    const expected = (3_000_000 - 400_000) / 29;
    const first = monthBudgets(3_000_000, aban, [spend(0, 400_000)]);
    near(first[0].overspent, 300_000);
    near(first[0].remaining, -300_000);
    near(first[0].nextAllowance as number, expected);
    near(first[1].allowance, expected);
    // Spending that new allowance every day keeps every later day at the same level.
    const steady = monthBudgets(3_000_000, aban, followAllowance(3_000_000, aban, { 0: 400_000 }));
    for (let i = 1; i < 30; i++) near(steady[i].allowance, expected);
  });

  it("only looks at spending before a day, never after", () => {
    const withLater = monthBudgets(3_000_000, aban, [spend(10, 500_000)]);
    const without = monthBudgets(3_000_000, aban, []);
    for (let i = 0; i <= 10; i++) near(withLater[i].allowance, without[i].allowance);
    assert.ok(withLater[11].allowance < without[11].allowance);
  });

  it("adds up several expenses on the same day", () => {
    const budgets = monthBudgets(3_000_000, aban, [spend(0, 30_000, "a"), spend(0, 70_000, "b")]);
    near(budgets[0].spent, 100_000);
    near(budgets[0].remaining, 0);
  });

  it("reports a shortfall and zero allowance once the month is used up", () => {
    const budgets = monthBudgets(100_000, aban, [spend(0, 150_000)]);
    near(budgets[0].shortfall, 50_000);
    near(budgets[0].nextAllowance as number, 0);
    for (let i = 1; i < 30; i++) {
      near(budgets[i].allowance, 0);
      near(budgets[i].shortfall, 50_000);
    }
  });

  it("gives nothing to spend when the pool is already negative", () => {
    for (const day of monthBudgets(-500_000, aban, [])) {
      assert.equal(day.allowance, 0);
      near(day.shortfall, 500_000);
    }
  });

  it("has no next day on the last day", () => {
    const budgets = monthBudgets(3_000_000, aban, followAllowance(3_000_000, aban, { 0: 1_000_000 }));
    assert.equal(budgets[29].nextAllowance, null);
    near(budgets[29].allowance, (3_000_000 - 1_000_000) / 29);
  });

  it("ignores expenses that fall outside the month", () => {
    const outside: Expense = { id: "x", day: "2026-01-01", amount: 999_999 };
    const budgets = monthBudgets(3_000_000, aban, [outside]);
    near(budgets[0].allowance, 100_000);
    near(budgets[0].spent, 0);
  });

  it("spends exactly the pool by the end when every day follows its allowance", () => {
    const expenses = followAllowance(3_000_000, aban, { 5: 250_000, 12: 10_000 });
    near(
      expenses.reduce((sum, e) => sum + e.amount, 0),
      3_000_000,
    );
  });
});

describe("expense validation", () => {
  it("accepts a good expense and trims the note", () => {
    assert.deepEqual(cleanExpense({ id: "a", day: "2026-11-14", amount: 85_000, note: "  نان  " }), {
      id: "a",
      day: "2026-11-14",
      amount: 85_000,
      note: "نان",
    });
    assert.equal(cleanExpense({ id: "a", day: "2026-11-14", amount: 1, note: "   " })?.note, undefined);
    assert.equal(cleanExpense({ id: "a", day: "2026-11-14", amount: 1, note: "x".repeat(200) })?.note?.length, 80);
  });

  it("rejects bad ids, days and amounts", () => {
    assert.equal(cleanExpense(null), null);
    assert.equal(cleanExpense({ id: "", day: "2026-11-14", amount: 5 }), null);
    assert.equal(cleanExpense({ id: "a", day: "14 Nov", amount: 5 }), null);
    assert.equal(cleanExpense({ id: "a", day: "2026-11-14", amount: 0 }), null);
    assert.equal(cleanExpense({ id: "a", day: "2026-11-14", amount: -5 }), null);
    assert.equal(cleanExpense({ id: "a", day: "2026-11-14", amount: 1.5 }), null);
    assert.equal(cleanExpense({ id: "a", day: "2026-11-14", amount: 1e11 }), null);
  });

  it("sorts by day and drops duplicates and junk", () => {
    const list = cleanExpenses([
      { id: "b", day: "2026-11-15", amount: 2 },
      { id: "a", day: "2026-11-14", amount: 1 },
      { id: "a", day: "2026-11-16", amount: 9 },
      { id: "c", day: "bad", amount: 3 },
    ]);
    assert.deepEqual(
      list.map((e) => [e.id, e.day]),
      [
        ["a", "2026-11-14"],
        ["b", "2026-11-15"],
      ],
    );
    assert.deepEqual(cleanExpenses("nope"), []);
  });
});

describe("moving an expense to another day", () => {
  const list: Expense[] = [
    { id: "a", day: "2026-11-10", amount: 100 },
    { id: "b", day: "2026-11-12", amount: 200, note: "نان" },
  ];

  it("changes the day and keeps the list in day order", () => {
    const next = patchExpense(list, "a", { day: "2026-11-14" });
    assert.deepEqual(next.map((e) => [e.id, e.day]), [["b", "2026-11-12"], ["a", "2026-11-14"]]);
    assert.equal(next[0].note, "نان");
  });

  it("ignores a bad day, an unknown id and an invalid amount", () => {
    assert.equal(patchExpense(list, "a", { day: "2026-13-40" }), list);
    assert.equal(patchExpense(list, "a", { day: "امروز" }), list);
    assert.equal(patchExpense(list, "zzz", { day: "2026-11-14" }), list);
    assert.equal(patchExpense(list, "a", { amount: -5 }), list);
  });

  it("still edits amount and note without touching the day", () => {
    const next = patchExpense(list, "a", { amount: 150.4, note: " چای " });
    assert.deepEqual(next[0], { id: "a", day: "2026-11-10", amount: 150, note: "چای" });
  });

  it("moves the amount between months in the monthly sums", () => {
    const moved = patchExpense([{ id: "a", day: aban[3], amount: 1000 }], "a", { day: addDays(aban[29], 1) });
    assert.equal(moved[0].day > aban[29], true);
  });
});

describe("day choices for an expense", () => {
  const today = "2026-11-17";

  it("lists today back to 30 days, newest first, no future days", () => {
    const days = expenseDayChoices(today, "2026-11-10");
    assert.equal(days.length, 31);
    assert.equal(days[0], today);
    assert.equal(days[30], addDays(today, -30));
    assert.equal(days.every((day) => day <= today), true);
  });

  it("adds the expense's own day when it is older than 30 days", () => {
    const days = expenseDayChoices(today, "2026-08-01");
    assert.equal(days.length, 32);
    assert.equal(days[31], "2026-08-01");
  });

  it("does not add a future day", () => {
    assert.equal(expenseDayChoices(today, "2026-12-01").length, 31);
  });
});
