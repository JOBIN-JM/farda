import { isDayKey, type DayKey } from "./calendar.ts";

/** Money spent on one day outside the planned basket. Amounts are whole toman. */
export type Expense = {
  id: string;
  day: DayKey;
  amount: number;
  note?: string;
};

export const MAX_EXPENSE = 10_000_000_000;
export const MAX_NOTE_LENGTH = 80;
const MAX_EXPENSES = 3000;

export function cleanExpense(raw: unknown): Expense | null {
  if (!raw || typeof raw !== "object") return null;
  const { id, day, amount, note } = raw as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
  if (!isDayKey(day)) return null;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > MAX_EXPENSE) return null;
  const expense: Expense = { id, day, amount };
  if (typeof note === "string" && note.trim()) expense.note = note.trim().slice(0, MAX_NOTE_LENGTH);
  return expense;
}

/** Valid, unique-by-id expenses in day order; only the most recent are kept if there are too many. */
export function cleanExpenses(raw: unknown): Expense[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: Expense[] = [];
  for (const entry of raw) {
    const expense = cleanExpense(entry);
    if (!expense || seen.has(expense.id)) continue;
    seen.add(expense.id);
    clean.push(expense);
  }
  return clean.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)).slice(-MAX_EXPENSES);
}

/** What is left of the month to spend freely: budget − basket − this month's savings for the goal. */
export function monthPool(budget: number, basket: number, goalMonthly: number): number {
  return budget - basket - goalMonthly;
}

export type DayBudget = {
  day: DayKey;
  /** What this day may spend: (pool − spent before today) ÷ days left, never below 0. */
  allowance: number;
  spent: number;
  /** allowance − spent; negative once the day is over budget. */
  remaining: number;
  /** How much of today's spending went past today's allowance. */
  overspent: number;
  /** How far the whole month is over its pool after today (0 when it still fits). */
  shortfall: number;
  /** Allowance of the next day given what happened today; null on the last day. */
  nextAllowance: number | null;
};

/**
 * One pass over the month. Under-spending flows into later days and over-spending
 * is shared equally by the days that remain, because every day's allowance is
 * recomputed from what is still unspent.
 */
export function monthBudgets(pool: number, monthDays: DayKey[], expenses: Expense[]): DayBudget[] {
  const spentByDay = new Map<DayKey, number>();
  for (const expense of expenses) {
    spentByDay.set(expense.day, (spentByDay.get(expense.day) ?? 0) + expense.amount);
  }

  let spentBefore = 0;
  return monthDays.map((day, index) => {
    const daysLeft = monthDays.length - index;
    const available = pool - spentBefore;
    const allowance = available > 0 ? available / daysLeft : 0;
    const spent = spentByDay.get(day) ?? 0;
    const after = available - spent;
    spentBefore += spent;
    return {
      day,
      allowance,
      spent,
      remaining: allowance - spent,
      overspent: Math.max(0, spent - allowance),
      shortfall: Math.max(0, -after),
      nextAllowance: daysLeft > 1 ? (after > 0 ? after / (daysLeft - 1) : 0) : null,
    };
  });
}
