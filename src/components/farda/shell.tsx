import { useEffect, useState } from "react";
import { ChartColumn, House, ShoppingBasket, Target } from "lucide-react";
import { PRICE_AS_OF } from "@/lib/farda/catalog";
import { usePlan } from "@/lib/farda/store";
import { BasketView } from "./basket-view";
import { GoalView } from "./goal-view";
import { HomeView } from "./home-view";
import { ReportView } from "./report-view";

const TABS = [
  { id: "home", label: "خانه", icon: House },
  { id: "basket", label: "سبد", icon: ShoppingBasket },
  { id: "goal", label: "هدف", icon: Target },
  { id: "report", label: "گزارش", icon: ChartColumn },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AppShell() {
  const [tab, setTab] = useState<TabId>("home");

  useEffect(() => {
    void usePlan.persist.rehydrate();
  }, []);

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
          <p className="text-xs text-muted">قیمت‌ها: {PRICE_AS_OF}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-nav">
        {tab === "home" ? <HomeView onOpenGoal={() => setTab("goal")} /> : null}
        {tab === "basket" ? <BasketView /> : null}
        {tab === "goal" ? <GoalView /> : null}
        {tab === "report" ? <ReportView /> : null}
      </main>

      <nav className="nav-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface" aria-label="بخش‌های اصلی">
        <div className="mx-auto grid w-full max-w-xl grid-cols-4">
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
