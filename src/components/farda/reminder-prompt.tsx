import { useEffect, useId, useMemo, useState } from "react";
import { todayKey, type DayKey } from "@/lib/farda/calendar";
import { formatDayLabel, formatToman } from "@/lib/farda/format";
import { isTime, pendingDay, recentDays, snoozeAtTime, snoozeTomorrow } from "@/lib/farda/reminder";
import { usePlan } from "@/lib/farda/store";
import { useNow } from "@/lib/farda/use-now";
import { ExpenseForm } from "./expense-form";

const DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faTime = (time: string) => time.replace(/\d/g, (digit) => DIGITS[Number(digit)]);

function dayTitle(day: DayKey, now: Date): string {
  const today = todayKey(now);
  if (day === today) return "امروز چقدر خرج کردی؟";
  const yesterday = recentDays(now, 2)[1];
  if (day === yesterday) return "دیروز چقدر خرج کردی؟";
  return `خرج ${formatDayLabel(day)} را ثبت کن`;
}

/**
 * Asks about the day's spending once the reminder time has passed and the app is
 * open. Closing it only hides it until the app is opened again; the buttons
 * inside decide whether the day is done or the question comes back later.
 */
export function ReminderPrompt({ enabled }: { enabled: boolean }) {
  const reminder = usePlan((s) => s.reminder);
  const expenses = usePlan((s) => s.expenses);
  const reviewedDays = usePlan((s) => s.reviewedDays);
  const trackingSince = usePlan((s) => s.trackingSince);
  const now = useNow();

  const pending = useMemo(
    () =>
      enabled
        ? pendingDay({
            now,
            reminder,
            trackingSince,
            expenseDays: new Set(expenses.map((expense) => expense.day)),
            reviewedDays: new Set(reviewedDays),
          })
        : null,
    [enabled, now, reminder, trackingSince, expenses, reviewedDays],
  );

  const [open, setOpen] = useState<DayKey | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Once it is showing it stays up, even if logging an expense makes the day "not pending" any more.
  useEffect(() => {
    if (open === null && !dismissed && pending !== null) setOpen(pending);
  }, [open, dismissed, pending]);

  if (open === null) return null;
  return (
    <PromptSheet
      key={open}
      initialDay={open}
      now={now}
      onClose={() => setOpen(null)}
      onDismiss={() => {
        setDismissed(true);
        setOpen(null);
      }}
    />
  );
}

export function PromptSheet({
  initialDay,
  now,
  onClose,
  onDismiss,
}: {
  initialDay: DayKey;
  now: Date;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const titleId = useId();
  const selectId = useId();
  const timeId = useId();
  const reminder = usePlan((s) => s.reminder);
  const expenses = usePlan((s) => s.expenses);
  const addExpense = usePlan((s) => s.addExpense);
  const markReviewed = usePlan((s) => s.markReviewed);
  const snoozeReminder = usePlan((s) => s.snoozeReminder);

  const [day, setDay] = useState(initialDay);
  const [later, setLater] = useState(false);
  const [custom, setCustom] = useState(reminder.time);

  const choices = useMemo(() => {
    const days = recentDays(now, 7);
    return days.includes(initialDay) ? days : [...days, initialDay].sort().reverse();
  }, [now, initialDay]);
  const dayExpenses = expenses.filter((expense) => expense.day === day);
  const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  function snooze(until: string) {
    snoozeReminder(until);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-card bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <h2 id={titleId} className="text-lg font-extrabold">
          {dayTitle(day, now)}
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted">فقط خرج‌هایی که جزو سبد برنامه‌ریزی‌شده نیستند.</p>

        <div className="mt-3 flex items-center gap-2">
          <label htmlFor={selectId} className="shrink-0 text-sm text-muted">
            برای روز
          </label>
          <select
            id={selectId}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-primary"
          >
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {formatDayLabel(choice)}
              </option>
            ))}
          </select>
        </div>

        {dayExpenses.length > 0 ? (
          <p className="mt-3 text-sm font-bold tabular-nums">
            ثبت‌شده برای این روز: {formatToman(total)}
            <span className="font-normal text-muted"> ({dayExpenses.length.toLocaleString("fa-IR")} مورد)</span>
          </p>
        ) : null}

        <div className="mt-3">
          <ExpenseForm autoFocus onAdd={(amount, note) => addExpense({ day, amount, note })} />
        </div>

        <button
          type="button"
          onClick={() => {
            markReviewed(day);
            onClose();
          }}
          className="mt-3 min-h-11 w-full rounded-xl border border-line bg-surface text-sm font-bold"
        >
          {dayExpenses.length > 0 ? "همین‌ها بود" : "خرجی نداشتم"}
        </button>

        {later ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface p-3">
            <button
              type="button"
              onClick={() => snooze(snoozeTomorrow(now, reminder.time))}
              className="min-h-11 rounded-xl border border-line bg-bg text-sm font-bold"
            >
              فردا همین ساعت ({faTime(reminder.time)})
            </button>
            <div className="flex items-center gap-2">
              <label htmlFor={timeId} className="shrink-0 text-sm text-muted">
                ساعت دلخواه
              </label>
              <input
                id={timeId}
                type="time"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-base tabular-nums text-ink outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={!isTime(custom)}
                onClick={() => snooze(snoozeAtTime(now, custom))}
                className="min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary disabled:opacity-40"
              >
                یادآوری کن
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setLater(true)} className="mt-2 min-h-11 w-full text-sm font-bold text-primary">
            بعداً یادآوری کن
          </button>
        )}

        <button type="button" onClick={onDismiss} className="mt-1 min-h-11 w-full text-sm text-muted">
          بستن
        </button>
      </div>
    </div>
  );
}
