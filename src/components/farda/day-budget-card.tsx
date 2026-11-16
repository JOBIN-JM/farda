import { useState } from "react";
import type { DayBudget, Expense } from "@/lib/farda/budget";
import type { DayKey } from "@/lib/farda/calendar";
import { formatCompact, formatDayLabel, formatToman } from "@/lib/farda/format";
import { ExpenseForm } from "./expense-form";
import { Card } from "./ui";

/** Allowance / spent / left for one day. */
export function BudgetFigures({ budget }: { budget: DayBudget }) {
  const over = budget.remaining < 0;
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      <div>
        <dt className="text-xs text-muted">بودجه روز</dt>
        <dd className="mt-1 text-sm font-extrabold tabular-nums">{formatCompact(Math.round(budget.allowance))}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">خرج‌شده</dt>
        <dd className="mt-1 text-sm font-extrabold tabular-nums">{formatCompact(budget.spent)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{over ? "بیشتر از بودجه" : "باقی‌مانده"}</dt>
        <dd className={`mt-1 text-sm font-extrabold tabular-nums ${over ? "text-danger" : ""}`}>
          {formatCompact(Math.abs(Math.round(budget.remaining)))}
        </dd>
      </div>
    </dl>
  );
}

/** The warning or hint that goes with a day's budget, if any. */
export function BudgetNotes({ budget, isToday }: { budget: DayBudget; isToday: boolean }) {
  if (budget.shortfall > 0) {
    return (
      <p className="text-sm font-bold leading-6 text-danger">
        {formatCompact(Math.round(budget.shortfall))} از بودجه این ماه کم آمده؛ برای روزهای بعد چیزی نمی‌ماند.
      </p>
    );
  }
  if (budget.overspent > 0 && budget.nextAllowance !== null) {
    return (
      <p className="text-sm leading-6 text-muted">
        از روز بعد، بودجه هر روز حدود{" "}
        <span className="font-bold tabular-nums">{formatCompact(Math.round(budget.nextAllowance))}</span> می‌شود.
      </p>
    );
  }
  if (isToday && budget.remaining > 0) {
    return <p className="text-xs leading-5 text-muted">هرچه امروز کمتر خرج کنی، به بودجه روزهای بعد اضافه می‌شود.</p>;
  }
  return null;
}

/** One day's budget, its expenses (deletable) and a form to log more. */
export function DayBudgetCard({
  day,
  today,
  budget,
  expenses,
  onAdd,
  onRemove,
}: {
  day: DayKey;
  today: DayKey;
  /** Null when the day is outside the current month, where the free pool is not defined. */
  budget: DayBudget | null;
  expenses: Expense[];
  onAdd: (amount: number, note: string) => void;
  onRemove: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">خرج {formatDayLabel(day)}</h3>
        {day === today ? (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">امروز</span>
        ) : null}
      </div>

      {budget ? (
        <div className="mt-3 flex flex-col gap-3">
          <BudgetFigures budget={budget} />
          <BudgetNotes budget={budget} isToday={day === today} />
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted">بودجه روزانه فقط برای ماه جاری حساب می‌شود.</p>
      )}

      {expenses.length > 0 ? (
        <ul className="mt-3 flex flex-col">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
              <div className="min-w-0">
                <p className="text-sm font-bold tabular-nums">{formatToman(expense.amount)}</p>
                {expense.note ? <p className="truncate text-xs text-muted">{expense.note}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirmId !== expense.id) return setConfirmId(expense.id);
                  onRemove(expense.id);
                  setConfirmId(null);
                }}
                className={`min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold ${
                  confirmId === expense.id ? "bg-danger text-on-danger" : "text-danger"
                }`}
              >
                {confirmId === expense.id ? "تأیید حذف" : "حذف"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 border-t border-line pt-3">
        {day <= today ? (
          <ExpenseForm onAdd={onAdd} />
        ) : (
          <p className="text-xs leading-5 text-muted">خرج روزهای آینده را همان روز ثبت کن.</p>
        )}
      </div>
    </Card>
  );
}
