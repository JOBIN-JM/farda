import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  WEEKDAY_LETTERS,
  monthDaysOfKey,
  monthKeyOf,
  shiftMonthKey,
  todayKey,
  weekdayOf,
  type DayKey,
} from "@/lib/farda/calendar";
import { formatDayLabel, formatNumber, monthLabelFromKey } from "@/lib/farda/format";
import { monthBudgets } from "@/lib/farda/budget";
import { qtyOn, scheduledDays, toggleDay } from "@/lib/farda/schedule";
import { useMonthPool, usePlan, useVisibleItems } from "@/lib/farda/store";
import { DayBudgetCard } from "./day-budget-card";
import { Card } from "./ui";

const MAX_DOTS = 3;

/** Month view of what is planned to be consumed each day, with per-day skip / add. */
export function CalendarView({ onOpenBasket }: { onOpenBasket: () => void }) {
  const schedules = usePlan((s) => s.schedules);
  const allItems = useVisibleItems();
  const setSchedule = usePlan((s) => s.setSchedule);
  const expenses = usePlan((s) => s.expenses);
  const addExpense = usePlan((s) => s.addExpense);
  const updateExpense = usePlan((s) => s.updateExpense);
  const removeExpense = usePlan((s) => s.removeExpense);
  const { left: pool } = useMonthPool();
  const [today] = useState(() => todayKey());
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(today));
  const [picked, setPicked] = useState<DayKey>(today);

  const days = useMemo(() => monthDaysOfKey(monthKey), [monthKey]);
  const items = allItems.filter((item) => schedules[item.id] && item.portion);
  const selected = days.includes(picked) ? picked : days[0];

  // For each day, which scheduled items are consumed on it.
  const perDay = useMemo(() => {
    const map = new Map<DayKey, number>();
    for (const item of allItems) {
      const schedule = schedules[item.id];
      if (!schedule || !item.portion) continue;
      for (const day of scheduledDays(schedule, days)) map.set(day, (map.get(day) ?? 0) + 1);
    }
    return map;
  }, [schedules, allItems, days]);

  // Day keys are ISO strings, so a plain string comparison finds this month's expenses.
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.day >= days[0] && expense.day <= days[days.length - 1]),
    [expenses, days],
  );
  const isCurrentMonth = monthKey === monthKeyOf(today);
  const budgets = useMemo(
    () => (isCurrentMonth ? monthBudgets(pool, days, monthExpenses) : null),
    [isCurrentMonth, pool, days, monthExpenses],
  );
  const spentDays = useMemo(() => new Set(monthExpenses.map((expense) => expense.day)), [monthExpenses]);

  function goToMonth(delta: number) {
    const next = shiftMonthKey(monthKey, delta);
    const nextDays = monthDaysOfKey(next);
    setMonthKey(next);
    setPicked(nextDays.includes(today) ? today : nextDays[0]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="ماه قبل"
          onClick={() => goToMonth(-1)}
          className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
        <h2 className="text-xl font-extrabold" aria-live="polite">
          {monthLabelFromKey(monthKey)}
        </h2>
        <button
          type="button"
          aria-label="ماه بعد"
          onClick={() => goToMonth(1)}
          className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted" aria-hidden="true">
          {WEEKDAY_LETTERS.map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: weekdayOf(days[0]) }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden="true" />
          ))}
          {days.map((day, index) => {
            const count = perDay.get(day) ?? 0;
            const hasSpending = spentDays.has(day);
            const overspent = (budgets?.[index].overspent ?? 0) > 0;
            const isSelected = day === selected;
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${formatDayLabel(day)}${isToday ? "، امروز" : ""}، ${
                  count > 0 ? `${formatNumber(count)} مورد مصرف` : "بدون مصرف برنامه‌ریزی‌شده"
                }${hasSpending ? (overspent ? "، خرج بیشتر از بودجه" : "، خرج ثبت شده") : ""}`}
                onClick={() => setPicked(day)}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-bold tabular-nums ${
                  isSelected
                    ? "border-primary bg-primary text-on-primary"
                    : isToday
                      ? "border-primary bg-surface text-primary"
                      : "border-line bg-surface text-ink"
                }`}
              >
                {formatNumber(index + 1)}
                <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                  {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => (
                    <span key={i} className="size-1.5 rounded-full bg-current opacity-70" />
                  ))}
                  {hasSpending ? (
                    <span
                      className={`h-1 w-3 rounded-full ${overspent && !isSelected ? "bg-danger" : "bg-current"}`}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <DayBudgetCard
        key={selected}
        day={selected}
        today={today}
        budget={budgets ? budgets[days.indexOf(selected)] : null}
        expenses={monthExpenses.filter((expense) => expense.day === selected)}
        onAdd={(amount, note) => addExpense({ day: selected, amount, note })}
        onUpdate={(id, amount, note, day) => updateExpense(id, { amount, note, day })}
        onRemove={removeExpense}
      />

      <Card>
        <h3 className="text-sm font-bold">مصرف برنامه‌ریزی‌شده {formatDayLabel(selected)}</h3>
        {items.length === 0 ? (
          <>
            <p className="mt-2 text-sm leading-6 text-muted">
              هنوز برای هیچ جنسی برنامه تکرار نگذاشتی. مثلاً بگو تخم‌مرغ شنبه، یکشنبه و چهارشنبه مصرف می‌شود تا اینجا
              روز به روز ببینی چه چیزی قرار است مصرف شود.
            </p>
            <button
              type="button"
              onClick={onOpenBasket}
              className="mt-3 min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary"
            >
              رفتن به سبد
            </button>
          </>
        ) : (
          <>
            <ul className="mt-2 flex flex-col">
              {items.map((item) => {
                const schedule = schedules[item.id];
                const occurs = scheduledDays(schedule, days).includes(selected);
                const skipped = schedule.skips?.includes(selected) === true;
                const extra = occurs && schedule.extras?.includes(selected) === true;
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${occurs ? "" : "text-muted"}`}>{item.name}</p>
                      <p className="text-xs text-muted tabular-nums">
                        {occurs
                          ? `${formatNumber(qtyOn(schedule, selected))} ${item.portion?.label}${extra ? " · یک‌باره" : ""}`
                          : skipped
                            ? "برای این روز حذف شده"
                            : "این روز نیست"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSchedule(item.id, toggleDay(schedule, selected, days))}
                      className="min-h-11 shrink-0 rounded-xl border border-line bg-bg px-3 text-xs font-bold"
                    >
                      {occurs ? "این روز نباشد" : "این روز هم باشد"}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs leading-5 text-muted">
              تغییر یک روز فقط همان روز را عوض می‌کند و جمع سبد این ماه را به‌روز می‌کند.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
