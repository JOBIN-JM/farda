import { useEffect, useState } from "react";
import { formatCompact, formatPercent, formatToman, persianMonthKey, persianMonthLabel } from "@/lib/farda/format";
import { futurePrice, savingsPlan } from "@/lib/farda/money";
import { useMonthPool, usePlan } from "@/lib/farda/store";
import type { DayKey } from "@/lib/farda/calendar";
import { todayKey } from "@/lib/farda/calendar";
import { ReminderSettings } from "./reminder-settings";
import { TodayCard } from "./today-card";
import { Card, MoneyField } from "./ui";

export function HomeView({ onOpenGoal, onOpenCalendar }: { onOpenGoal: () => void; onOpenCalendar: () => void }) {
  const { budget, basket, save, left } = useMonthPool();
  const setBudget = usePlan((s) => s.setBudget);
  const goals = usePlan((s) => s.goals);
  const activeGoalId = usePlan((s) => s.activeGoalId);
  const householdInflation = usePlan((s) => s.householdInflation);
  const checkIn = usePlan((s) => s.checkIn);
  const undoCheckIn = usePlan((s) => s.undoCheckIn);

  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [monthLabel, setMonthLabel] = useState<string | null>(null);
  // Read the clock after mount: the server's date can differ from the device's.
  const [today, setToday] = useState<DayKey | null>(null);
  useEffect(() => {
    setToday(todayKey());
    setMonthKey(persianMonthKey());
    setMonthLabel(persianMonthLabel());
  }, []);

  const goal = goals.find((item) => item.id === activeGoalId) ?? goals[0];
  const plan = goal ? savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual) : null;
  const committed = basket + save;
  const over = left < 0;
  const futureBasket = futurePrice(basket, householdInflation, 12);
  const basketShare = budget > 0 ? (basket / budget) * 100 : 0;
  const futureShare = budget > 0 ? (futureBasket / budget) * 100 : 0;
  const scale = Math.max(budget, committed, 1);
  const basketWidth = (basket / scale) * 100;
  const saveWidth = (save / scale) * 100;
  const checked = Boolean(goal && monthKey && goal.checkInKey === monthKey);
  const progress = plan && goal && plan.future > 0 ? Math.min(100, (goal.saved / plan.future) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {goal && plan ? (
        <section className="rounded-card bg-primary p-5 text-on-primary">
          <p className="text-sm text-on-primary/80">
            کنارگذاشت {monthLabel ?? "این ماه"}
          </p>
          <p className="mt-1 text-4xl font-extrabold leading-tight tabular-nums">{formatCompact(plan.monthly)}</p>
          <p className="mt-2 text-sm leading-6 text-on-primary/90">
            برای {goal.name}. قیمت روز خرید{" "}
            <span className="font-bold tabular-nums">{formatCompact(plan.future)}</span>
            {" "}است، نه {formatCompact(goal.price)} امروز.
          </p>
          {plan.shortfall > 0 ? (
            <p className="mt-3 text-sm leading-6 text-on-primary/85">
              اگر فقط قیمت امروز را تقسیم کنی، سرِ موعد حدود{" "}
              <span className="font-bold tabular-nums">{formatCompact(plan.shortfall)}</span> کم می‌آوری.
            </p>
          ) : null}
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-on-primary/25">
            <div className="h-full bg-on-primary" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-on-primary/80 tabular-nums">
            ثبت‌شده {formatCompact(goal.saved)} از {formatCompact(plan.future)}
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 w-full rounded-xl bg-on-primary px-4 text-sm font-bold text-primary disabled:opacity-70"
            disabled={!monthKey}
            onClick={() => {
              if (!monthKey) return;
              if (checked) undoCheckIn(goal.id, monthKey);
              else checkIn(goal.id, monthKey);
            }}
          >
            {checked ? "برگردان ثبت این ماه" : "این ماه را کنار گذاشتم"}
          </button>
        </section>
      ) : (
        <Card>
          <h2 className="text-lg font-bold">هنوز هدفی نداری</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            یک خرید بگذار تا به‌جای قیمت امروز، قیمت روز خرید را قسط کنیم.
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary"
            onClick={onOpenGoal}
          >
            تعریف هدف خرید
          </button>
        </Card>
      )}

      {today ? <TodayCard today={today} onOpenCalendar={onOpenCalendar} /> : null}

      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold">بودجه این ماه</h2>
          <p className={`text-sm font-bold tabular-nums ${over ? "text-danger" : "text-ink"}`}>
            {over ? `${formatCompact(Math.abs(left))} جلو افتادی` : `${formatCompact(left)} می‌ماند`}
          </p>
        </div>
        <MoneyField id="budget" label="درآمد یا بودجه‌ای که واقعاً در اختیار داری" value={budget} onChange={setBudget} />
        <div
          className="mt-4 flex h-3 overflow-hidden rounded-full bg-line"
          role="img"
          aria-label="تقسیم بودجه بین سبد، پس‌انداز و باقی‌مانده"
        >
          <div className="h-full bg-ink" style={{ width: `${basketWidth}%` }} />
          <div className="h-full bg-primary" style={{ width: `${saveWidth}%` }} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-muted">سبد</dt>
            <dd className="mt-1 font-bold tabular-nums">{formatCompact(basket)}</dd>
          </div>
          <div>
            <dt className="text-muted">پس‌انداز هدف</dt>
            <dd className="mt-1 font-bold tabular-nums text-primary">{formatCompact(save)}</dd>
          </div>
          <div>
            <dt className="text-muted">آزاد</dt>
            <dd className="mt-1 font-bold tabular-nums">{over ? "—" : formatCompact(left)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-base font-bold">سبد همین خانه، سال بعد</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          اگر تورم رسمی {formatPercent(householdInflation)} بماند و بودجه تکان نخورد، همین خرید ماهانه گران‌تر می‌شود.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg p-3">
            <p className="text-xs text-muted">امروز</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums">{formatCompact(basket)}</p>
            <p className="mt-1 text-xs text-muted tabular-nums">{formatPercent(basketShare)} بودجه</p>
          </div>
          <div className="rounded-xl bg-primary-soft p-3">
            <p className="text-xs text-muted">۱۲ ماه بعد</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-primary">{formatCompact(futureBasket)}</p>
            <p className="mt-1 text-xs text-muted tabular-nums">{formatPercent(futureShare)} بودجه امروز</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6">
          اختلاف ماهانه حدود{" "}
          <span className="font-bold tabular-nums">{formatToman(Math.max(0, futureBasket - basket))}</span>
          {" "}است. این را هم باید جایی در بودجه جا بدهی.
        </p>
      </Card>

      <ReminderSettings />
    </div>
  );
}
