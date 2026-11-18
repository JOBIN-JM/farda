import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { formatDecimal, formatNumber, formatWords, parseDecimal, parseDigits } from "@/lib/farda/format";

const MILLION = 1_000_000;
const THOUSAND = 1_000;
const MAX_MILLIONS = 999_999;
const QUICK_STEPS = [-1_000_000, 500_000, 1_000_000, 5_000_000];

type Part = "millions" | "thousands";

/**
 * Two-part amount entry: whole millions + the remainder in thousands of toman
 * (1,500,000 = "1" + "500"), with a spoken-style readout and quick +/- chips.
 * Amounts are rounded to whole thousands as soon as the user edits either part.
 */
export function MoneyField({
  id,
  label,
  value,
  onChange,
  steps = QUICK_STEPS,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  steps?: number[];
}) {
  const [focused, setFocused] = useState<Part | null>(null);
  const [draft, setDraft] = useState("");

  const millions = Math.floor(value / MILLION);
  const thousands = Math.floor((value % MILLION) / THOUSAND);

  function shown(part: Part, amount: number) {
    if (focused === part) return draft;
    return amount ? formatNumber(amount) : "";
  }

  function focusPart(part: Part, amount: number) {
    setFocused(part);
    setDraft(amount ? String(amount) : "");
  }

  const fieldClass =
    "flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary";
  const inputClass =
    "min-h-11 w-full min-w-0 bg-transparent py-2 text-base text-ink tabular-nums outline-none";

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block p-0 text-sm text-muted">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className={fieldClass} htmlFor={`${id}-millions`}>
          <input
            id={`${id}-millions`}
            inputMode="numeric"
            maxLength={7}
            className={inputClass}
            value={shown("millions", millions)}
            placeholder="۰"
            onFocus={() => focusPart("millions", millions)}
            onBlur={() => setFocused(null)}
            onChange={(event) => {
              setDraft(event.target.value);
              const next = Math.min(MAX_MILLIONS, parseDigits(event.target.value));
              onChange(next * MILLION + thousands * THOUSAND);
            }}
          />
          <span className="shrink-0 text-sm text-muted">میلیون</span>
        </label>
        <label className={fieldClass} htmlFor={`${id}-thousands`}>
          <input
            id={`${id}-thousands`}
            inputMode="numeric"
            maxLength={3}
            className={inputClass}
            value={shown("thousands", thousands)}
            placeholder="۰"
            onFocus={() => focusPart("thousands", thousands)}
            onBlur={() => setFocused(null)}
            onChange={(event) => {
              setDraft(event.target.value);
              onChange(millions * MILLION + parseDigits(event.target.value) * THOUSAND);
            }}
          />
          <span className="shrink-0 text-sm text-muted">هزار تومان</span>
        </label>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted tabular-nums">
        {value > 0 ? `${formatWords(value)} تومان` : "مبلغ را وارد کن"}
      </p>
      {steps.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {steps.map((step) => (
            <button
              key={step}
              type="button"
              disabled={step < 0 && value <= 0}
              onClick={() => onChange(Math.max(0, value + step))}
              className="min-h-10 rounded-full border border-line bg-bg px-3 text-xs font-bold tabular-nums disabled:opacity-40"
            >
              {step < 0 ? "−" : "+"}
              {formatWords(Math.abs(step))}
            </button>
          ))}
        </div>
      ) : null}
    </fieldset>
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
