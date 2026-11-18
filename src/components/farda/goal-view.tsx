import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GOAL_PRESETS, INFLATION_PRESETS } from "@/lib/farda/catalog";
import { formatCompact, formatDecimal, formatToman } from "@/lib/farda/format";
import { HORIZON_MONTHS, futurePrice, savingsPlan } from "@/lib/farda/money";
import { usePlan } from "@/lib/farda/store";
import { Card, MoneyField, PercentField } from "./ui";

export function GoalView() {
  const goals = usePlan((s) => s.goals);
  const activeGoalId = usePlan((s) => s.activeGoalId);
  const selectGoal = usePlan((s) => s.selectGoal);
  const patchGoal = usePlan((s) => s.patchGoal);
  const addGoal = usePlan((s) => s.addGoal);
  const removeGoal = usePlan((s) => s.removeGoal);
  const goal = goals.find((item) => item.id === activeGoalId) ?? goals[0];
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setConfirmDelete(false);
  }, [goal?.id]);

  const plan = goal ? savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual) : null;

  const chart = useMemo(() => {
    if (!goal || goal.price <= 0) return [];
    const marks = [0];
    const step = goal.months <= 6 ? 1 : goal.months <= 12 ? 2 : 3;
    for (let month = step; month < goal.months; month += step) marks.push(month);
    if (marks[marks.length - 1] !== goal.months) marks.push(goal.months);
    return marks.map((month) => ({
      label: month === 0 ? "امروز" : `${month.toLocaleString("fa-IR")} ماه`,
      price: futurePrice(goal.price, goal.annualInflation, month),
    }));
  }, [goal]);

  if (!goal || !plan) {
    return (
      <Card>
        <h2 className="text-lg font-bold">هدفی نمانده</h2>
        <p className="mt-2 text-sm leading-6 text-muted">یکی از خریدهای زیر را اضافه کن.</p>
        <PresetRow disabled={false} onAdd={addGoal} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold">هدف خرید</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          قسط را روی قیمت روز خرید حساب می‌کنیم، نه برچسب امروز.
        </p>
      </div>

      {goals.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {goals.map((item) => {
            const active = item.id === goal.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectGoal(item.id)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${
                  active ? "bg-ink text-on-primary" : "bg-surface text-ink border border-line"
                }`}
              >
                {item.name || "بدون نام"}
              </button>
            );
          })}
        </div>
      ) : null}

      <section className="rounded-card bg-ink p-5 text-on-primary" aria-live="polite">
        <p className="text-sm text-on-primary/70">هر ماه کنار بگذار</p>
        <p className="mt-1 text-4xl font-extrabold leading-tight tabular-nums">
          {goal.price > 0 ? formatCompact(plan.monthly) : "—"}
        </p>
        <p className="mt-2 text-sm leading-6 text-on-primary/80 tabular-nums">
          {goal.price > 0
            ? `${formatToman(plan.monthly)} · قیمت بعد از ${goal.months.toLocaleString("fa-IR")} ماه: ${formatToman(plan.future)}`
            : "اول قیمت امروز هدف را وارد کن."}
        </p>
      </section>

      {goal.price > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted">اگر تورم را خط بزنی</p>
            <p className="mt-2 text-lg font-extrabold tabular-nums">{formatCompact(plan.naiveMonthly)}</p>
            <p className="mt-1 text-xs leading-5 text-muted">در ماه، فقط بر اساس قیمت امروز</p>
          </Card>
          <Card className="bg-primary-soft p-3">
            <p className="text-xs text-muted">با تورم {formatDecimal(goal.annualInflation)}٪</p>
            <p className="mt-2 text-lg font-extrabold tabular-nums text-primary">{formatCompact(plan.monthly)}</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {plan.shortfall > 0
                ? `${formatCompact(plan.shortfall)} کسری در پایان`
                : "با این فرض، به قیمت روز خرید می‌رسی"}
            </p>
          </Card>
        </div>
      ) : null}

      {mounted && chart.length > 1 ? (
        <Card>
          <h3 className="text-sm font-bold">مسیر قیمت تا روز خرید</h3>
          <p className="mt-1 text-xs text-muted">از چپ، امروز. به راست، موعد خرید.</p>
          <div className="mt-3 h-44 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  formatter={(value) => [formatToman(Number(value ?? 0)), "قیمت"]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 12,
                    fontSize: 12,
                    direction: "rtl",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary-soft)"
                  strokeWidth={2}
                  isAnimationActive={!reduceMotion}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <label className="block" htmlFor="goal-name">
          <span className="mb-2 block text-sm text-muted">نام هدف</span>
          <input
            id="goal-name"
            value={goal.name}
            maxLength={32}
            onChange={(event) => patchGoal(goal.id, { name: event.target.value })}
            className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base outline-none focus:border-primary"
          />
        </label>
        <MoneyField
          id="goal-price"
          label="قیمت امروز هدف"
          value={goal.price}
          onChange={(price) => patchGoal(goal.id, { price })}
        />
        <div>
          <p className="mb-2 text-sm text-muted">چند ماه تا خرید</p>
          <div className="grid grid-cols-4 gap-2">
            {HORIZON_MONTHS.map((months) => {
              const active = goal.months === months;
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => patchGoal(goal.id, { months })}
                  className={`min-h-11 rounded-xl text-sm font-bold tabular-nums ${
                    active ? "bg-primary text-on-primary" : "bg-bg text-ink"
                  }`}
                >
                  {months.toLocaleString("fa-IR")}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">نرخ تورم سالانه</p>
          <div className="grid grid-cols-2 gap-2">
            {INFLATION_PRESETS.map((preset) => {
              const active = goal.annualInflation === preset.rate;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => patchGoal(goal.id, { annualInflation: preset.rate })}
                  className={`min-h-14 rounded-xl px-3 py-2 text-right ${
                    active ? "bg-ink text-on-primary" : "bg-bg text-ink"
                  }`}
                >
                  <span className="block text-sm font-bold">{preset.label}</span>
                  <span className={`mt-0.5 block text-xs ${active ? "text-on-primary/75" : "text-muted"}`}>
                    {preset.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <PercentField
          id="inflation"
          label="یا نرخ خودت"
          value={goal.annualInflation}
          onChange={(annualInflation) => patchGoal(goal.id, { annualInflation })}
        />
        <PercentField
          id="deposit"
          label="سود سالانه سپرده، اگر هست"
          value={goal.depositAnnual}
          onChange={(depositAnnual) => patchGoal(goal.id, { depositAnnual })}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-bg text-sm font-bold"
            onClick={() => patchGoal(goal.id, { depositAnnual: 0 })}
          >
            بدون سود
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-bg text-sm font-bold"
            onClick={() => patchGoal(goal.id, { depositAnnual: 20 })}
          >
            سناریوی سود ۲۰٪
          </button>
        </div>
        <p className="text-xs leading-6 text-muted">
          سود ۲۰٪ یک سناریو است، نه نرخ رسمی امروز. در تورم بالا معمولاً سود سپرده از رشد قیمت عقب می‌ماند؛
          برای همین حالت پیش‌فرض، بدون سود است.
        </p>
      </Card>

      <Card>
        <h3 className="text-sm font-bold">یک هدف دیگر</h3>
        <p className="mt-1 text-xs leading-6 text-muted">
          قیمت‌های نمونه را عوض کن. اپ فقط تورم را حساب می‌کند.
        </p>
        <PresetRow disabled={goals.length >= 8} onAdd={addGoal} />
        {goals.length >= 8 ? <p className="mt-2 text-xs text-muted">حداکثر ۸ هدف.</p> : null}
      </Card>

      <details className="rounded-card border border-line bg-surface px-4 py-3 text-sm leading-7">
        <summary className="cursor-pointer font-bold">منطق محاسبه</summary>
        <p className="mt-2 text-muted">
          قیمت آینده = قیمت امروز × (۱ + تورم سالانه) به توان (ماه ÷ ۱۲).
          بعد قسط ثابت طوری بسته می‌شود که در پایان مدت، با سود سپرده اگر وارد کرده باشی، به همان قیمت آینده برسد.
          اگر سود صفر باشد، قسط همان قیمت آینده تقسیم بر تعداد ماه است.
        </p>
        <p className="mt-2 text-muted">
          خطای رایج این است که قیمت امروز را بر ماه‌ها تقسیم کنیم. آن مبلغ به قیمت روز خرید نمی‌رسد.
        </p>
      </details>

      <button
        type="button"
        className={`min-h-11 text-sm font-bold ${
          confirmDelete ? "rounded-xl bg-danger px-4 text-on-danger" : "text-danger"
        }`}
        onClick={() => {
          if (!confirmDelete) {
            setConfirmDelete(true);
            return;
          }
          removeGoal(goal.id);
        }}
      >
        {confirmDelete ? "بله، این هدف پاک شود" : "حذف این هدف"}
      </button>
    </div>
  );
}

function PresetRow({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (draft: { name: string; price: number; annualInflation: number }) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {GOAL_PRESETS.map((preset) => (
        <button
          key={preset.name}
          type="button"
          disabled={disabled}
          onClick={() => onAdd(preset)}
          className="min-h-11 rounded-full border border-line bg-bg px-4 text-sm font-bold disabled:opacity-40"
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
}
