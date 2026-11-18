import type { Expense } from "./budget.ts";
import { monthKeyOf } from "./calendar.ts";

/** Snapshot of a month's basket and confirmed savings, frozen once the month is over. */
export type MonthRecord = {
  basket: number;
  saved: number;
};

export type MonthRow = {
  /** Persian month, "1405-08". */
  key: string;
  /** Null for a month that only has logged spending and no basket snapshot. */
  basket: number | null;
  saved: number;
  /** Spending logged day by day, outside the basket. */
  extras: number;
  total: number;
};

/**
 * One row per month that has a snapshot or logged spending, newest first.
 * Spending is summed straight from the daily log, so it is always current.
 */
export function monthRows(
  history: Record<string, MonthRecord>,
  expenses: readonly Pick<Expense, "day" | "amount">[] = [],
): MonthRow[] {
  const extrasByMonth = new Map<string, number>();
  const monthOfDay = new Map<string, string>();
  for (const expense of expenses) {
    let key = monthOfDay.get(expense.day);
    if (key === undefined) {
      key = monthKeyOf(expense.day);
      monthOfDay.set(expense.day, key);
    }
    extrasByMonth.set(key, (extrasByMonth.get(key) ?? 0) + expense.amount);
  }

  const keys = new Set([...Object.keys(history), ...extrasByMonth.keys()]);
  // "YYYY-MM" keys sort chronologically as strings.
  return [...keys]
    .sort()
    .reverse()
    .map((key) => {
      const record = history[key];
      const extras = extrasByMonth.get(key) ?? 0;
      const basket = record ? record.basket : null;
      const saved = record?.saved ?? 0;
      return { key, basket, saved, extras, total: (basket ?? 0) + saved + extras };
    });
}

export function averageSpend(rows: MonthRow[]): number {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.total, 0) / rows.length);
}
