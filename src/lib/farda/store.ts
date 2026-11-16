import { useMemo, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  CATALOG,
  MAX_ITEM_PRICE,
  PORTIONS_PER_UNIT,
  PRICE_AS_OF,
  basketTotal,
  defaultPriceOf,
  type PriceOverrides,
} from "./catalog";
import { isDayKey, monthDaysOfKey, monthKeyOf, todayKey, type DayKey } from "./calendar";
import { formatFeedDate } from "./format";
import { cleanExpense, cleanExpenses, monthPool, type Expense } from "./budget";
import type { MonthRecord } from "./history";
import { monthlySetAside, snapMonths } from "./money";
import { cleanPriceMap, isNewerFeed, restoreFeed, type PriceFeed } from "./price-feed";
import { DEFAULT_REMINDER, cleanDayList, cleanReminder, type ReminderSettings } from "./reminder";
import { cleanSchedule, monthlyQty, type Schedule } from "./schedule";

export type Goal = {
  id: string;
  name: string;
  price: number;
  months: number;
  annualInflation: number;
  depositAnnual: number;
  saved: number;
  checkInKey: string | null;
};

const MAX_HISTORY_MONTHS = 24;

type Persisted = {
  budget: number;
  qty: Record<string, number>;
  /** Items with a repeat schedule use it instead of their fixed `qty` (which is kept for switching back). */
  schedules: Record<string, Schedule>;
  priceOverrides: PriceOverrides;
  /** Latest downloaded price feed (null until one has been fetched). */
  feed: PriceFeed | null;
  history: Record<string, MonthRecord>;
  /** Spending outside the basket, by day. */
  expenses: Expense[];
  reminder: ReminderSettings;
  /** Days the user confirmed (logged everything, or had nothing to log). */
  reviewedDays: DayKey[];
  /** First day the app was used; the reminder never asks about earlier days. */
  trackingSince: DayKey | null;
  householdInflation: number;
  goals: Goal[];
  activeGoalId: string;
};

function clampRate(n: number, max = 300): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n * 10) / 10));
}

export function defaultGoal(): Goal {
  return {
    id: "goal-phone",
    name: "گوشی",
    price: 45_000_000,
    months: 12,
    annualInflation: 100,
    depositAnnual: 0,
    saved: 0,
    checkInKey: null,
  };
}

function defaultQty(): Record<string, number> {
  const qty: Record<string, number> = {};
  for (const item of CATALOG) {
    if (item.defaultQty > 0) qty[item.id] = item.defaultQty;
  }
  return qty;
}

function sanitizeSchedules(raw: unknown): Record<string, Schedule> {
  const clean: Record<string, Schedule> = {};
  if (!raw || typeof raw !== "object") return clean;
  for (const item of CATALOG) {
    const schedule = cleanSchedule((raw as Record<string, unknown>)[item.id]);
    if (schedule) clean[item.id] = schedule;
  }
  return clean;
}

function sanitizeHistory(raw: unknown): Record<string, MonthRecord> {
  const clean: Record<string, MonthRecord> = {};
  if (!raw || typeof raw !== "object") return clean;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(key) || !value || typeof value !== "object") continue;
    const { basket, saved } = value as Partial<MonthRecord>;
    if (typeof basket !== "number" || !Number.isFinite(basket)) continue;
    clean[key] = { basket, saved: typeof saved === "number" && Number.isFinite(saved) ? saved : 0 };
  }
  return clean;
}

function freshPersisted(): Persisted {
  const goal = defaultGoal();
  return {
    budget: 30_000_000,
    qty: defaultQty(),
    schedules: {},
    priceOverrides: {},
    feed: null,
    history: {},
    expenses: [],
    reminder: DEFAULT_REMINDER,
    reviewedDays: [],
    trackingSince: null,
    householdInflation: 71.4,
    goals: [goal],
    activeGoalId: goal.id,
  };
}

type Plan = Persisted & {
  setBudget: (n: number) => void;
  setQty: (id: string, n: number) => void;
  /** Override an item's price. Setting it back to the catalog default clears the override. */
  /** Give an item a repeat schedule, or pass null to go back to its fixed quantity. */
  setSchedule: (id: string, schedule: Schedule | null) => void;
  setPrice: (id: string, n: number) => void;
  resetPrice: (id: string) => void;
  /** Adopt a downloaded feed if it is newer than the one we have. */
  applyFeed: (feed: PriceFeed) => void;
  /** Snapshot this month's basket and confirmed savings into the history. */
  recordMonth: (monthKey: string) => void;
  addExpense: (input: { day: string; amount: number; note?: string }) => void;
  removeExpense: (id: string) => void;
  /** Change reminder settings. Changing the time or switching it on/off clears any snooze. */
  setReminder: (patch: Partial<Pick<ReminderSettings, "enabled" | "time">>) => void;
  snoozeReminder: (until: string | null) => void;
  markReviewed: (day: DayKey) => void;
  startTracking: (day: DayKey) => void;
  setHouseholdInflation: (n: number) => void;
  patchGoal: (id: string, patch: Partial<Omit<Goal, "id" | "saved" | "checkInKey">>) => void;
  addGoal: (draft: Pick<Goal, "name" | "price" | "annualInflation">) => void;
  removeGoal: (id: string) => void;
  selectGoal: (id: string) => void;
  checkIn: (id: string, monthKey: string) => void;
  undoCheckIn: (id: string, monthKey: string) => void;
  reset: () => void;
};

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const usePlan = create<Plan>()(
  persist(
    (set, get) => ({
      ...freshPersisted(),
      setBudget: (n) => set({ budget: Math.max(0, Math.round(n)) }),
      setQty: (id, n) =>
        set({
          qty: { ...get().qty, [id]: Math.max(0, Math.min(99, Math.round(n))) },
        }),
      setSchedule: (id, schedule) => {
        if (!CATALOG.some((item) => item.id === id)) return;
        const { [id]: _previous, ...rest } = get().schedules;
        if (schedule === null) return set({ schedules: rest });
        const clean = cleanSchedule(schedule);
        if (clean) set({ schedules: { ...rest, [id]: clean } });
      },
      setPrice: (id, n) => {
        const item = CATALOG.find((entry) => entry.id === id);
        if (!item) return;
        const price = Math.min(MAX_ITEM_PRICE, Math.round(n));
        if (!Number.isFinite(price) || price <= 0) return;
        const { [id]: _previous, ...rest } = get().priceOverrides;
        const isDefault = price === defaultPriceOf(item, get().feed?.prices);
        set({ priceOverrides: isDefault ? rest : { ...rest, [id]: price } });
      },
      resetPrice: (id) => {
        if (!(id in get().priceOverrides)) return;
        const { [id]: _removed, ...rest } = get().priceOverrides;
        set({ priceOverrides: rest });
      },
      applyFeed: (feed) => {
        if (!isNewerFeed(feed, get().feed)) return;
        // An edit that now matches the new default is redundant; every other edit stays.
        const priceOverrides = { ...get().priceOverrides };
        for (const item of CATALOG) {
          if (priceOverrides[item.id] === defaultPriceOf(item, feed.prices)) delete priceOverrides[item.id];
        }
        set({ feed, priceOverrides });
      },
      addExpense: ({ day, amount, note }) => {
        const expense = cleanExpense({
          id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          day,
          amount: Math.round(amount),
          note,
        });
        if (expense) set({ expenses: cleanExpenses([...get().expenses, expense]) });
      },
      removeExpense: (id) => set({ expenses: get().expenses.filter((expense) => expense.id !== id) }),
      setReminder: (patch) =>
        set({ reminder: cleanReminder({ ...get().reminder, ...patch, snoozedUntil: null }) }),
      snoozeReminder: (until) => set({ reminder: cleanReminder({ ...get().reminder, snoozedUntil: until }) }),
      markReviewed: (day) => {
        if (isDayKey(day)) set({ reviewedDays: cleanDayList([...get().reviewedDays, day]) });
      },
      startTracking: (day) => {
        if (get().trackingSince === null && isDayKey(day)) set({ trackingSince: day });
      },
      recordMonth: (monthKey) => {
        const state = get();
        const monthly = monthlyQty(state.qty, state.schedules, monthDaysOfKey(monthKey), PORTIONS_PER_UNIT);
        const basket = basketTotal(monthly, state.priceOverrides, state.feed?.prices);
        const saved = state.goals.reduce(
          (sum, goal) =>
            goal.checkInKey === monthKey
              ? sum + monthlySetAside(goal.price, goal.annualInflation, goal.months, goal.depositAnnual)
              : sum,
          0,
        );
        const current = state.history[monthKey];
        if (current && current.basket === basket && current.saved === saved) return;
        const history = { ...state.history, [monthKey]: { basket, saved } };
        const keys = Object.keys(history).sort();
        for (const old of keys.slice(0, Math.max(0, keys.length - MAX_HISTORY_MONTHS))) delete history[old];
        set({ history });
      },
      setHouseholdInflation: (n) => set({ householdInflation: clampRate(n) }),
      patchGoal: (id, patch) =>
        set({
          goals: get().goals.map((goal) => {
            if (goal.id !== id) return goal;
            return {
              ...goal,
              name: patch.name !== undefined ? patch.name.slice(0, 32) : goal.name,
              price: patch.price !== undefined ? Math.max(0, Math.round(patch.price)) : goal.price,
              months: patch.months !== undefined ? snapMonths(patch.months) : goal.months,
              annualInflation:
                patch.annualInflation !== undefined ? clampRate(patch.annualInflation) : goal.annualInflation,
              depositAnnual:
                patch.depositAnnual !== undefined ? clampRate(patch.depositAnnual, 80) : goal.depositAnnual,
            };
          }),
        }),
      addGoal: (draft) => {
        if (get().goals.length >= 8) return;
        const goal: Goal = {
          id: `goal-${crypto.randomUUID()}`,
          name: draft.name.slice(0, 32) || "هدف جدید",
          price: Math.max(0, Math.round(draft.price)),
          months: 12,
          annualInflation: clampRate(draft.annualInflation),
          depositAnnual: 0,
          saved: 0,
          checkInKey: null,
        };
        set({ goals: [...get().goals, goal], activeGoalId: goal.id });
      },
      removeGoal: (id) => {
        const goals = get().goals.filter((goal) => goal.id !== id);
        set({
          goals,
          activeGoalId: get().activeGoalId === id ? (goals[0]?.id ?? "") : get().activeGoalId,
        });
      },
      selectGoal: (id) => set({ activeGoalId: id }),
      checkIn: (id, monthKey) => {
        const goal = get().goals.find((item) => item.id === id);
        if (!goal || goal.checkInKey === monthKey || goal.price <= 0) return;
        const add = monthlySetAside(goal.price, goal.annualInflation, goal.months, goal.depositAnnual);
        set({
          goals: get().goals.map((item) =>
            item.id === id ? { ...item, saved: item.saved + add, checkInKey: monthKey } : item,
          ),
        });
      },
      undoCheckIn: (id, monthKey) => {
        const goal = get().goals.find((item) => item.id === id);
        if (!goal || goal.checkInKey !== monthKey) return;
        const add = monthlySetAside(goal.price, goal.annualInflation, goal.months, goal.depositAnnual);
        set({
          goals: get().goals.map((item) =>
            item.id === id
              ? { ...item, saved: Math.max(0, item.saved - add), checkInKey: null }
              : item,
          ),
        });
      },
      // The feed is shared data, not the user's plan, so a reset keeps it.
      reset: () => set({ ...freshPersisted(), feed: get().feed }),
    }),
    {
      name: "farda-plan-v1",
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage : localStorage)),
      skipHydration: true,
      partialize: (state) => ({
        budget: state.budget,
        qty: state.qty,
        schedules: state.schedules,
        priceOverrides: state.priceOverrides,
        feed: state.feed,
        history: state.history,
        expenses: state.expenses,
        reminder: state.reminder,
        reviewedDays: state.reviewedDays,
        trackingSince: state.trackingSince,
        householdInflation: state.householdInflation,
        goals: state.goals,
        activeGoalId: state.activeGoalId,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const saved = persisted as Partial<Persisted>;
        const goals = (saved.goals ?? current.goals).map((goal) => ({
          ...defaultGoal(),
          ...goal,
          months: snapMonths(goal.months ?? 12),
          depositAnnual: goal.depositAnnual ?? 0,
          saved: goal.saved ?? 0,
          checkInKey: goal.checkInKey ?? null,
        }));
        const activeGoalId = goals.some((goal) => goal.id === saved.activeGoalId)
          ? (saved.activeGoalId as string)
          : (goals[0]?.id ?? "");
        return {
          ...current,
          budget: typeof saved.budget === "number" ? saved.budget : current.budget,
          qty: saved.qty ?? current.qty,
          schedules: sanitizeSchedules(saved.schedules),
          priceOverrides: cleanPriceMap(saved.priceOverrides),
          feed: restoreFeed(saved.feed),
          history: sanitizeHistory(saved.history),
          expenses: cleanExpenses(saved.expenses),
          reminder: cleanReminder(saved.reminder),
          reviewedDays: cleanDayList(saved.reviewedDays),
          trackingSince: isDayKey(saved.trackingSince) ? saved.trackingSince : null,
          householdInflation:
            typeof saved.householdInflation === "number" ? saved.householdInflation : current.householdInflation,
          goals,
          activeGoalId,
        };
      },
    },
  ),
);

/** The date shown next to prices: the feed's date once one is loaded, else the catalog's. */
export function usePriceDate(): string {
  const asOf = usePlan((s) => s.feed?.asOf);
  return asOf ? formatFeedDate(asOf) : PRICE_AS_OF;
}

/** Days of the current Persian month. */
export function useMonthDays(): DayKey[] {
  // Scheduled items are empty on the first render, so server and client markup agree.
  const [monthKey] = useState(() => monthKeyOf(todayKey()));
  return useMemo(() => monthDaysOfKey(monthKey), [monthKey]);
}

/**
 * Quantity per item for the current Persian month, in purchase units: fixed
 * items keep their quantity, scheduled items count how often they occur.
 */
export function useMonthlyQty(): Record<string, number> {
  const qty = usePlan((s) => s.qty);
  const schedules = usePlan((s) => s.schedules);
  const days = useMonthDays();
  return useMemo(() => monthlyQty(qty, schedules, days, PORTIONS_PER_UNIT), [qty, schedules, days]);
}

/**
 * This month's free pool: budget − basket − the active goal's monthly savings.
 * It is the same "می‌ماند" number the home screen shows.
 */
export function useMonthPool() {
  const budget = usePlan((s) => s.budget);
  const goals = usePlan((s) => s.goals);
  const activeGoalId = usePlan((s) => s.activeGoalId);
  const priceOverrides = usePlan((s) => s.priceOverrides);
  const feedPrices = usePlan((s) => s.feed?.prices);
  const monthly = useMonthlyQty();
  const basket = basketTotal(monthly, priceOverrides, feedPrices);
  const goal = goals.find((item) => item.id === activeGoalId) ?? goals[0];
  const save = goal ? monthlySetAside(goal.price, goal.annualInflation, goal.months, goal.depositAnnual) : 0;
  return { budget, basket, save, left: monthPool(budget, basket, save) };
}
