/** Savings that must meet a price which itself grows with inflation. */

export const HORIZON_MONTHS = [6, 12, 18, 24] as const;

export type HorizonMonths = (typeof HORIZON_MONTHS)[number];

export type SavingsPlan = {
  future: number;
  monthly: number;
  naiveMonthly: number;
  naiveAccumulated: number;
  shortfall: number;
};

function monthlyRate(annualPct: number): number {
  if (annualPct <= 0) return 0;
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/** Price after `months`, given an annual inflation rate (12 months = exactly 1 + rate). */
export function futurePrice(present: number, annualInflationPct: number, months: number): number {
  if (present <= 0 || months <= 0) return Math.max(0, Math.round(present));
  const grown = present * Math.pow(1 + annualInflationPct / 100, months / 12);
  return Math.round(grown);
}

/** What a fixed monthly deposit grows into, payments at each month-end. */
export function accumulated(monthly: number, months: number, depositAnnualPct: number): number {
  if (monthly <= 0 || months <= 0) return 0;
  const i = monthlyRate(depositAnnualPct);
  if (i <= 1e-8) return Math.round(monthly * months);
  const factor = (Math.pow(1 + i, months) - 1) / i;
  return Math.round(monthly * factor);
}

/**
 * Fixed toman to set aside each month so the pot equals the inflated price.
 * Deposit interest is optional and defaults to zero — typical Iranian deposits
 * do not keep up with inflation, so zero is the honest baseline.
 */
export function monthlySetAside(
  present: number,
  annualInflationPct: number,
  months: number,
  depositAnnualPct = 0,
): number {
  if (present <= 0 || months <= 0) return 0;
  const target = futurePrice(present, annualInflationPct, months);
  const i = monthlyRate(depositAnnualPct);
  if (i <= 1e-8) return Math.round(target / months);
  const factor = (Math.pow(1 + i, months) - 1) / i;
  return Math.round(target / factor);
}

export function savingsPlan(
  present: number,
  annualInflationPct: number,
  months: number,
  depositAnnualPct = 0,
): SavingsPlan {
  const future = futurePrice(present, annualInflationPct, months);
  const monthly = monthlySetAside(present, annualInflationPct, months, depositAnnualPct);
  const naiveMonthly = months > 0 && present > 0 ? Math.round(present / months) : 0;
  const naiveAccumulated = accumulated(naiveMonthly, months, depositAnnualPct);
  return {
    future,
    monthly,
    naiveMonthly,
    naiveAccumulated,
    shortfall: Math.max(0, future - naiveAccumulated),
  };
}

export function snapMonths(months: number): HorizonMonths {
  return (HORIZON_MONTHS as readonly number[]).includes(months) ? (months as HorizonMonths) : 12;
}
