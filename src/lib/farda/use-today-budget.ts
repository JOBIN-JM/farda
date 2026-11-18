import { useMemo } from "react";
import { monthBudgets, type DayBudget, type Expense } from "./budget";
import { monthDaysOfKey, monthKeyOf, type DayKey } from "./calendar";
import { useMonthPool, usePlan } from "./store";

/** Budget figures and expenses for `today`, with the free pool of the current month. */
export function useTodayBudget(today: DayKey): { budget: DayBudget | null; expenses: Expense[] } {
  const all = usePlan((s) => s.expenses);
  const { left } = useMonthPool();
  return useMemo(() => {
    const days = monthDaysOfKey(monthKeyOf(today));
    const monthExpenses = all.filter((expense) => expense.day >= days[0] && expense.day <= days[days.length - 1]);
    const budgets = monthBudgets(left, days, monthExpenses);
    return {
      budget: budgets[days.indexOf(today)] ?? null,
      expenses: monthExpenses.filter((expense) => expense.day === today),
    };
  }, [all, left, today]);
}
