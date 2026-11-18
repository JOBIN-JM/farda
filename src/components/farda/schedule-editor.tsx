import { useMemo, useState } from "react";
import type { CatalogItem } from "@/lib/farda/catalog";
import { WEEKDAY_LETTERS, WEEKDAY_NAMES, jalaliOf, todayKey, type DayKey } from "@/lib/farda/calendar";
import { formatCompact, formatDayLabel, formatDecimal, formatNumber, parseDigits } from "@/lib/farda/format";
import {
  cleanSchedule,
  monthlyCount,
  scheduledDays,
  type Recurrence,
  type Schedule,
} from "@/lib/farda/schedule";

type Kind = Recurrence["kind"];

const KINDS: { kind: Kind; label: string }[] = [
  { kind: "weekdays", label: "روزهای هفته" },
  { kind: "every-n-days", label: "هر چند روز" },
  { kind: "monthly", label: "ماهی یک‌بار" },
];

const selectClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-primary";
const fieldClass =
  "flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary";
const inputClass = "min-h-11 w-full min-w-0 bg-transparent py-2 text-base text-ink tabular-nums outline-none";

/**
 * Repeat-schedule editor for one basket item (e.g. eggs on Sat, Sun and Wed).
 * Quantity is entered per occurrence in the item's consumption unit.
 */
export function ScheduleEditor({
  item,
  schedule,
  price,
  monthDays,
  onSave,
  onRemove,
  onClose,
}: {
  item: CatalogItem;
  schedule: Schedule | undefined;
  /** Price per purchase unit, for the monthly cost preview. */
  price: number;
  monthDays: DayKey[];
  onSave: (schedule: Schedule) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const portion = item.portion;
  const today = useMemo(() => todayKey(), []);
  const existing = schedule?.recurrence;
  const defaultAnchor = monthDays.includes(today) ? today : monthDays[0];

  const [kind, setKind] = useState<Kind>(existing?.kind ?? "weekdays");
  const [weekdays, setWeekdays] = useState<number[]>(existing?.kind === "weekdays" ? existing.days : []);
  const [everyN, setEveryN] = useState(existing?.kind === "every-n-days" ? String(existing.n) : "2");
  const [anchor, setAnchor] = useState<DayKey>(
    existing?.kind === "every-n-days" && monthDays.includes(existing.anchor) ? existing.anchor : defaultAnchor,
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    existing?.kind === "monthly" ? existing.dayOfMonth : jalaliOf(defaultAnchor).day,
  );
  const [qty, setQty] = useState(schedule ? String(schedule.qty) : "");

  if (!portion) return null;

  const recurrence: Recurrence =
    kind === "weekdays"
      ? { kind, days: weekdays }
      : kind === "every-n-days"
        ? { kind, n: parseDigits(everyN), anchor }
        : { kind, dayOfMonth };
  // Keep skips / one-off days / per-weekday quantities from an earlier version of this schedule.
  const candidate = cleanSchedule({ ...schedule, recurrence, qty: parseDigits(qty) });
  const valid = candidate !== null && candidate.qty > 0;

  const times = candidate ? scheduledDays(candidate, monthDays).length : 0;
  const portions = candidate ? monthlyCount(candidate, monthDays) : 0;
  const purchaseUnits = portions / portion.perUnit;

  function toggleWeekday(day: number) {
    setWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-xl bg-bg p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && candidate) {
          onSave(candidate);
          onClose();
        }
      }}
    >
      <div role="group" aria-label="نوع تکرار" className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
        {KINDS.map((option) => (
          <button
            key={option.kind}
            type="button"
            aria-pressed={kind === option.kind}
            onClick={() => setKind(option.kind)}
            className={`min-h-11 rounded-lg px-1 text-sm font-bold ${
              kind === option.kind ? "bg-primary text-on-primary" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {kind === "weekdays" ? (
        <div>
          <p className="mb-2 text-sm text-muted">چه روزهایی؟</p>
          <div role="group" aria-label="روزهای هفته" className="grid grid-cols-7 gap-1">
            {WEEKDAY_LETTERS.map((letter, day) => (
              <button
                key={day}
                type="button"
                aria-pressed={weekdays.includes(day)}
                aria-label={WEEKDAY_NAMES[day]}
                onClick={() => toggleWeekday(day)}
                className={`min-h-11 rounded-xl border text-sm font-bold ${
                  weekdays.includes(day)
                    ? "border-primary bg-primary text-on-primary"
                    : "border-line bg-surface text-ink"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {kind === "every-n-days" ? (
        <>
          <label className="text-sm text-muted" htmlFor={`every-${item.id}`}>
            هر چند روز یک‌بار؟
          </label>
          <span className={fieldClass}>
            <span className="shrink-0 text-sm text-muted">هر</span>
            <input
              id={`every-${item.id}`}
              inputMode="numeric"
              maxLength={3}
              className={inputClass}
              value={everyN}
              onChange={(event) => setEveryN(event.target.value)}
              onFocus={(event) => event.target.select()}
            />
            <span className="shrink-0 text-sm text-muted">روز</span>
          </span>
          <label className="text-sm text-muted" htmlFor={`anchor-${item.id}`}>
            یکی از روزهایی که مصرف می‌کنی
          </label>
          <select
            id={`anchor-${item.id}`}
            className={selectClass}
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
          >
            {monthDays.map((day) => (
              <option key={day} value={day}>
                {formatDayLabel(day)}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {kind === "monthly" ? (
        <>
          <label className="text-sm text-muted" htmlFor={`dom-${item.id}`}>
            کدام روز ماه؟
          </label>
          <select
            id={`dom-${item.id}`}
            className={selectClass}
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(Number(event.target.value))}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {formatNumber(day)}
              </option>
            ))}
          </select>
          {dayOfMonth > 29 ? (
            <p className="text-xs leading-5 text-muted">در ماه‌های کوتاه‌تر، آخرین روز ماه حساب می‌شود.</p>
          ) : null}
        </>
      ) : null}

      <label className="text-sm text-muted" htmlFor={`qty-${item.id}`}>
        هر بار چقدر؟
      </label>
      <span className={fieldClass}>
        <input
          id={`qty-${item.id}`}
          inputMode="numeric"
          className={inputClass}
          value={qty}
          placeholder="۰"
          onChange={(event) => setQty(event.target.value)}
          onFocus={(event) => event.target.select()}
        />
        <span className="shrink-0 text-sm text-muted">{portion.label}</span>
      </span>

      <p className="text-xs leading-5 text-muted tabular-nums" aria-live="polite">
        {valid
          ? `این ماه ${formatNumber(times)} بار، جمعاً ${formatNumber(portions)} ${portion.label}` +
            (portion.perUnit > 1 ? ` (حدود ${formatDecimal(purchaseUnits, 2)} ${item.unit})` : "") +
            ` ≈ ${formatCompact(purchaseUnits * price)}`
          : kind === "weekdays" && weekdays.length === 0
            ? "حداقل یک روز را انتخاب کن."
            : kind === "every-n-days" && parseDigits(everyN) < 1
              ? "تعداد روز را وارد کن."
              : `مقدار هر بار را به ${portion.label} وارد کن.`}
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
        >
          ذخیره برنامه
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold"
        >
          انصراف
        </button>
      </div>
      {schedule ? (
        <button
          type="button"
          className="min-h-11 text-sm font-bold text-danger"
          onClick={() => {
            onRemove();
            onClose();
          }}
        >
          حذف برنامه تکرار
        </button>
      ) : null}
    </form>
  );
}
