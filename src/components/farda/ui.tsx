import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { formatDecimal, formatNumber, parseDecimal, parseDigits } from "@/lib/farda/format";

export function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <input
          id={id}
          inputMode="numeric"
          className="min-h-11 w-full bg-transparent py-2 text-base text-ink tabular-nums outline-none"
          value={focused ? draft : value ? formatNumber(value) : ""}
          placeholder="۰"
          onFocus={() => {
            setFocused(true);
            setDraft(value ? String(value) : "");
          }}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange(parseDigits(event.target.value));
          }}
        />
        <span className="shrink-0 text-sm text-muted">تومان</span>
      </span>
    </label>
  );
}

export function PercentField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <input
          id={id}
          inputMode="decimal"
          className="min-h-11 w-full bg-transparent py-2 text-base text-ink tabular-nums outline-none"
          value={focused ? draft : formatDecimal(value)}
          onFocus={() => {
            setFocused(true);
            setDraft(String(value));
          }}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange(parseDecimal(event.target.value));
          }}
        />
        <span className="shrink-0 text-sm text-muted">٪ سالانه</span>
      </span>
    </label>
  );
}

export function Stepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center rounded-xl border border-line bg-bg">
      <button
        type="button"
        className="flex size-11 items-center justify-center text-ink disabled:text-line"
        aria-label={`کم کردن ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" strokeWidth={2} />
      </button>
      <span className="w-8 text-center text-base tabular-nums">{value.toLocaleString("fa-IR")}</span>
      <button
        type="button"
        className="flex size-11 items-center justify-center text-ink disabled:text-line"
        aria-label={`افزودن ${label}`}
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-line bg-surface p-4 ${className}`}>{children}</section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-bold text-ink">{children}</h2>;
}
