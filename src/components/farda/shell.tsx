import { useEffect, useState } from "react";
import { CalendarDays, ChartColumn, House, ShoppingBasket, Target } from "lucide-react";
import { todayKey } from "@/lib/farda/calendar";
import { persianMonthKey } from "@/lib/farda/format";
import { usePlan, usePriceDate } from "@/lib/farda/store";
import { usePriceFeed } from "@/lib/farda/use-price-feed";
import { BasketView } from "./basket-view";
import { CalendarView } from "./calendar-view";
import { GoalView } from "./goal-view";
import { HomeView } from "./home-view";
import { ReminderPrompt } from "./reminder-prompt";
import { ReportView } from "./report-view";

const TABS = [
  { id: "home", label: "خانه", icon: House },
  { id: "basket", label: "سبد", icon: ShoppingBasket },
  { id: "calendar", label: "تقویم", icon: CalendarDays },
  { id: "goal", label: "هدف", icon: Target },
  { id: "report", label: "گزارش", icon: ChartColumn },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AppShell() {
  const [tab, setTab] = useState<TabId>("home");
  const [hydrated, setHydrated] = useState(false);
  const qty = usePlan((s) => s.qty);
  const schedules = usePlan((s) => s.schedules);
  const priceOverrides = usePlan((s) => s.priceOverrides);
  const hiddenItems = usePlan((s) => s.hiddenItems);
  const feed = usePlan((s) => s.feed);
  const priceDate = usePriceDate();
  const goals = usePlan((s) => s.goals);
  const recordMonth = usePlan((s) => s.recordMonth);
  const trackingSince = usePlan((s) => s.trackingSince);
  const startTracking = usePlan((s) => s.startTracking);

  useEffect(() => {
    void Promise.resolve(usePlan.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  usePriceFeed(hydrated);

  // The reminder only asks about days from the first one the app was used.
  useEffect(() => {
    if (hydrated && trackingSince === null) startTracking(todayKey());
  }, [hydrated, trackingSince, startTracking]);

  // Keep this month's row in the report current. Wait for hydration so the
  // defaults never overwrite a saved month.
  useEffect(() => {
    if (hydrated) recordMonth(persianMonthKey());
  }, [hydrated, qty, schedules, priceOverrides, hiddenItems, feed, goals, recordMonth]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-30 h-16 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-xl items-center justify-between px-4">
          <div>
            <p className="text-xs leading-4 text-muted">برنامه‌ریز تورم</p>
            <h1 className="text-xl font-extrabold leading-none">فردا</h1>
          </div>
          <p className="text-xs text-muted">قیمت‌ها: {priceDate}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-nav">
        {tab === "home" ? <HomeView onOpenGoal={() => setTab("goal")} onOpenCalendar={() => setTab("calendar")} /> : null}
        {tab === "basket" ? <BasketView /> : null}
        {tab === "calendar" ? <CalendarView onOpenBasket={() => setTab("basket")} /> : null}
        {tab === "goal" ? <GoalView /> : null}
        {tab === "report" ? <ReportView /> : null}
      </main>

      <ReminderPrompt enabled={hydrated} />

      <nav className="nav-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface" aria-label="بخش‌های اصلی">
        <div className="mx-auto grid w-full max-w-xl grid-cols-5">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold ${
                  active ? "text-primary" : "text-muted"
                }`}
                onClick={() => setTab(item.id)}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
