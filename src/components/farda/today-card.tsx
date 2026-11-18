import type { DayKey } from "@/lib/farda/calendar";
import { formatCompact, formatDayLabel } from "@/lib/farda/format";
import { usePlan } from "@/lib/farda/store";
import { useTodayBudget } from "@/lib/farda/use-today-budget";
import { BudgetNotes } from "./day-budget-card";
import { ExpenseForm } from "./expense-form";
import { Card } from "./ui";

/** Home-screen card: what is left to spend today, with a quick way to log spending. */
export function TodayCard({ today, onOpenCalendar }: { today: DayKey; onOpenCalendar: () => void }) {
  const addExpense = usePlan((s) => s.addExpense);
  const { budget } = useTodayBudget(today);
  const over = budget !== null && budget.remaining < 0;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">امروز</h2>
        <p className="text-xs text-muted">{formatDayLabel(today)}</p>
      </div>

      {budget ? (
        <div className="mt-3 flex flex-col gap-1">
          <p className={`text-3xl font-extrabold leading-tight tabular-nums ${over ? "text-danger" : ""}`}>
            {formatCompact(Math.abs(Math.round(budget.remaining)))}
          </p>
          <p className={`text-sm ${over ? "font-bold text-danger" : "text-muted"}`}>
            {over ? "بیشتر از بودجه امروز خرج شده" : "برای امروز می‌ماند"}
          </p>
          <p className="text-xs text-muted tabular-nums">
            بودجه امروز {formatCompact(Math.round(budget.allowance))} · خرج‌شده {formatCompact(budget.spent)}
          </p>
          <div className="mt-2">
            <BudgetNotes budget={budget} isToday />
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        <ExpenseForm onAdd={(amount, note) => addExpense({ day: today, amount, note })} />
        <button type="button" className="mt-2 min-h-11 text-sm font-bold text-primary" onClick={onOpenCalendar}>
          ثبت برای روز دیگر یا دیدن خرج‌ها
        </button>
      </div>
    </Card>
  );
}
