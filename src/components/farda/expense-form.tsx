import { useId, useState } from "react";
import { MAX_EXPENSE, MAX_NOTE_LENGTH, expenseDayChoices } from "@/lib/farda/budget";
import type { DayKey } from "@/lib/farda/calendar";
import { formatDayLabel, formatWords, parseDigits } from "@/lib/farda/format";

/**
 * Amount (exact toman, spelled out underneath) + optional note. For a new expense it
 * clears itself after saving; with `initial` it edits an existing one and `onCancel` closes it.
 * Editing also offers a day select (today back to 30 days) when `initial.day` and `today` are given.
 */
export function ExpenseForm({
  onAdd,
  autoFocus = false,
  initial,
  today,
  submitLabel = "ثبت خرج",
  onCancel,
}: {
  onAdd: (amount: number, note: string, day?: DayKey) => void;
  autoFocus?: boolean;
  initial?: { amount: number; note?: string; day?: DayKey };
  /** Needed for the day select while editing. */
  today?: DayKey;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial ? String(initial.amount) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const dayId = useId();
  const dayChoices = initial?.day && today ? expenseDayChoices(today, initial.day) : null;
  // An expense dated in the future (device clock moved back) starts at today, the nearest allowed day.
  const [day, setDay] = useState<DayKey | undefined>(
    dayChoices ? (dayChoices.includes(initial!.day!) ? initial!.day : dayChoices[0]) : undefined,
  );

  const amount = parseDigits(draft);
  const valid = amount > 0 && amount <= MAX_EXPENSE;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onAdd(amount, note, day);
        if (!initial) {
          setDraft("");
          setNote("");
        }
      }}
    >
      <label htmlFor={id} className="text-sm text-muted">
        {initial ? "مبلغ خرج" : "چقدر خرج کردی؟"}
      </label>
      <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <input
          id={id}
          autoFocus={autoFocus || initial !== undefined}
          inputMode="numeric"
          className="min-h-11 w-full min-w-0 bg-transparent py-2 text-base text-ink tabular-nums outline-none"
          value={draft}
          placeholder="۰"
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => {
            if (initial) event.target.select();
          }}
        />
        <span className="shrink-0 text-sm text-muted">تومان</span>
      </span>
      <p className="text-xs leading-5 text-muted tabular-nums">
        {valid ? `${formatWords(amount)} تومان` : "مبلغ را به تومان وارد کن"}
      </p>
      {dayChoices ? (
        <>
          <label htmlFor={dayId} className="text-sm text-muted">
            روز
          </label>
          <select
            id={dayId}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-primary"
          >
            {dayChoices.map((choice) => (
              <option key={choice} value={choice}>
                {formatDayLabel(choice)}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <input
        aria-label="توضیح (اختیاری)"
        maxLength={MAX_NOTE_LENGTH}
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-primary"
        value={note}
        placeholder="توضیح (اختیاری)"
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold"
          >
            انصراف
          </button>
        ) : null}
      </div>
    </form>
  );
}
