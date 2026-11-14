import { useState } from "react";
import { INFLATION_PRESETS, basketTotal, categoryTotals } from "@/lib/farda/catalog";
import { formatCompact, formatPercent, formatToman } from "@/lib/farda/format";
import { futurePrice, savingsPlan } from "@/lib/farda/money";
import { usePlan } from "@/lib/farda/store";
import { Card } from "./ui";

const HORIZONS = [6, 12, 18] as const;

export function ReportView() {
  const qty = usePlan((s) => s.qty);
  const budget = usePlan((s) => s.budget);
  const goals = usePlan((s) => s.goals);
  const householdInflation = usePlan((s) => s.householdInflation);
  const setHouseholdInflation = usePlan((s) => s.setHouseholdInflation);
  const reset = usePlan((s) => s.reset);
  const [confirmReset, setConfirmReset] = useState(false);

  const basket = basketTotal(qty);
  const categories = categoryTotals(qty);
  const maxCategory = Math.max(...categories.map((item) => item.total), 1);
  const save = goals.reduce(
    (sum, goal) => sum + savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual).monthly,
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold">گزارش</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          خرج امروز یک طرف، فشاری که تورم به ماه‌های بعد می‌آورد طرف دیگر.
        </p>
      </div>

      <Card>
        <h3 className="text-sm font-bold">سبد به تفکیک</h3>
        {categories.length === 0 ? (
          <p className="mt-3 text-sm text-muted">هنوز مقداری برای سبد نگذاشتی.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {categories.map((category) => (
              <li key={category.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-bold">{category.label}</span>
                  <span className="tabular-nums text-muted">{formatToman(category.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${(category.total / maxCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm tabular-nums">
          جمع سبد {formatCompact(basket)}
          {budget > 0 ? ` · ${formatPercent((basket / budget) * 100)} بودجه` : ""}
        </p>
      </Card>

      <Card>
        <h3 className="text-sm font-bold">تورم روی همین سبد</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {INFLATION_PRESETS.map((preset) => {
            const active = householdInflation === preset.rate;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setHouseholdInflation(preset.rate)}
                className={`min-h-11 rounded-xl px-3 text-sm font-bold ${
                  active ? "bg-primary text-on-primary" : "bg-bg text-ink"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {HORIZONS.map((months) => {
            const future = futurePrice(basket, householdInflation, months);
            const extra = Math.max(0, future - basket);
            return (
              <li key={months} className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3">
                <div>
                  <p className="text-sm font-bold">{months.toLocaleString("fa-IR")} ماه بعد</p>
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    {formatCompact(extra)} گران‌تر از امروز
                  </p>
                </div>
                <p className="text-base font-extrabold tabular-nums">{formatCompact(future)}</p>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-bold">پس‌انداز هدف‌ها</h3>
        {goals.length === 0 ? (
          <p className="mt-3 text-sm text-muted">هدفی تعریف نشده.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {goals.map((goal) => {
              const plan = savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual);
              const share = budget > 0 ? (plan.monthly / budget) * 100 : 0;
              return (
                <li key={goal.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{goal.name || "بدون نام"}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {goal.months.toLocaleString("fa-IR")} ماه · تورم {formatPercent(goal.annualInflation)} · روز خرید{" "}
                      {formatCompact(plan.future)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold tabular-nums text-primary">{formatCompact(plan.monthly)}</p>
                    <p className="mt-1 text-xs text-muted tabular-nums">{formatPercent(share)} بودجه</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 border-t border-line pt-3 text-sm tabular-nums">
          جمع قسط‌ها {formatCompact(save)}
          {budget > 0 ? ` · با سبد روی هم ${formatCompact(basket + save)}` : ""}
        </p>
      </Card>

      <button
        type="button"
        className="min-h-11 text-sm font-bold text-primary"
        onClick={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          reset();
          setConfirmReset(false);
        }}
      >
        {confirmReset ? "بله، برنامه به حالت اول برگردد" : "بازنشانی برنامه"}
      </button>
    </div>
  );
}
