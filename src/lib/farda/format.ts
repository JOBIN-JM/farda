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

export function formatDecimal(n: number): string {
  return n.toLocaleString("fa-IR", { maximumFractionDigits: 1 });
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
