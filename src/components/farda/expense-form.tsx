import { useId, useState } from "react";
import { MAX_EXPENSE, MAX_NOTE_LENGTH } from "@/lib/farda/budget";
import { formatWords, parseDigits } from "@/lib/farda/format";

/** Amount (exact toman, spelled out underneath) + optional note. Clears itself after saving. */
export function ExpenseForm({
  onAdd,
  autoFocus = false,
}: {
  onAdd: (amount: number, note: string) => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");

  const amount = parseDigits(draft);
  const valid = amount > 0 && amount <= MAX_EXPENSE;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onAdd(amount, note);
        setDraft("");
        setNote("");
      }}
    >
      <label htmlFor={id} className="text-sm text-muted">
        چقدر خرج کردی؟
      </label>
      <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <input
          id={id}
          autoFocus={autoFocus}
          inputMode="numeric"
          className="min-h-11 w-full min-w-0 bg-transparent py-2 text-base text-ink tabular-nums outline-none"
          value={draft}
          placeholder="۰"
          onChange={(event) => setDraft(event.target.value)}
        />
        <span className="shrink-0 text-sm text-muted">تومان</span>
      </span>
      <p className="text-xs leading-5 text-muted tabular-nums">
        {valid ? `${formatWords(amount)} تومان` : "مبلغ را به تومان وارد کن"}
      </p>
      <input
        aria-label="توضیح (اختیاری)"
        maxLength={MAX_NOTE_LENGTH}
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-primary"
        value={note}
        placeholder="توضیح (اختیاری)"
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        type="submit"
        disabled={!valid}
        className="min-h-11 rounded-xl bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
      >
        ثبت خرج
      </button>
    </form>
  );
}
