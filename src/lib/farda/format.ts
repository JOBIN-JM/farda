import { WEEKDAY_NAMES, jalaliOf, weekdayOf } from "./calendar.ts";

const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC = "٠١٢٣٤٥٦٧٨٩";

function foldDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (ch) => String(PERSIAN.indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String(ARABIC.indexOf(ch)))
    .replace(/٫/g, ".")
    .replace(/,/g, ".");
}

export function parseDigits(raw: string): number {
  const normalized = foldDigits(raw).replace(/[^\d]/g, "");
  if (!normalized) return 0;
  return Number(normalized);
}

export function parseDecimal(raw: string): number {
  const normalized = foldDigits(raw).replace(/[^\d.]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("fa-IR");
}

export function formatDecimal(n: number, digits = 1): string {
  return n.toLocaleString("fa-IR", { maximumFractionDigits: digits });
}

export function formatToman(n: number): string {
  return `${formatNumber(n)} تومان`;
}

export function formatCompact(n: number): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  if (v >= 1_000_000_000) {
    const x = v / 1_000_000_000;
    return `${sign}${x.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیارد`;
  }
  if (v >= 1_000_000) {
    const x = v / 1_000_000;
    const digits = x >= 10 ? 1 : 2;
    return `${sign}${x.toLocaleString("fa-IR", { maximumFractionDigits: digits })} میلیون`;
  }
  if (v >= 10_000) {
    return `${sign}${Math.round(v / 1_000).toLocaleString("fa-IR")} هزار`;
  }
  return `${sign}${formatNumber(v)}`;
}

export function formatPercent(n: number): string {
  return `${n.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

export function persianMonthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0";
  const month = parts.find((p) => p.type === "month")?.value ?? "0";
  return `${year}-${month.padStart(2, "0")}`;
}

export function persianMonthLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "۱ میلیون و ۵۰۰ هزار" — the amount spelled the way people say it out loud. */
export function formatWords(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v === 0) return "۰";
  const parts: string[] = [];
  const billions = Math.floor(v / 1_000_000_000);
  const millions = Math.floor((v % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((v % 1_000_000) / 1_000);
  const rest = v % 1_000;
  if (billions) parts.push(`${formatNumber(billions)} میلیارد`);
  if (millions) parts.push(`${formatNumber(millions)} میلیون`);
  if (thousands) parts.push(`${formatNumber(thousands)} هزار`);
  if (rest) parts.push(formatNumber(rest));
  return parts.join(" و ");
}

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** "1405-08" -> "آبان ۱۴۰۵". Falls back to the raw key if it is malformed. */
export function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const name = PERSIAN_MONTHS[month - 1];
  if (!name || !Number.isFinite(year)) return key;
  return `${name} ${year.toLocaleString("fa-IR", { useGrouping: false })}`;
}

/** "2026-11-14" -> "۲۳ آبان ۱۴۰۵" */
export function formatFeedDate(isoDay: string): string {
  const date = new Date(`${isoDay}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDay;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "2026-11-14" -> "۲۳ آبان · شنبه" */
export function formatDayLabel(isoDay: string): string {
  const { month, day } = jalaliOf(isoDay);
  return `${formatNumber(day)} ${PERSIAN_MONTHS[month - 1]} · ${WEEKDAY_NAMES[weekdayOf(isoDay)]}`;
}
