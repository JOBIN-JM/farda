import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CATALOG } from "./catalog";
import { monthlySetAside, snapMonths } from "./money";

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

type Persisted = {
  budget: number;
  qty: Record<string, number>;
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

function freshPersisted(): Persisted {
  const goal = defaultGoal();
  return {
    budget: 30_000_000,
    qty: defaultQty(),
    householdInflation: 71.4,
    goals: [goal],
    activeGoalId: goal.id,
  };
}

type Plan = Persisted & {
  setBudget: (n: number) => void;
  setQty: (id: string, n: number) => void;
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
      reset: () => set(freshPersisted()),
    }),
    {
      name: "farda-plan-v1",
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage : localStorage)),
      skipHydration: true,
      partialize: (state) => ({
        budget: state.budget,
        qty: state.qty,
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
          householdInflation:
            typeof saved.householdInflation === "number" ? saved.householdInflation : current.householdInflation,
          goals,
          activeGoalId,
        };
      },
    },
  ),
);
