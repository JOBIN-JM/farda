import { CATALOG, type PriceMap } from "./catalog.ts";
import { cleanPriceMap, parsePriceFeed, type PriceFeed } from "./price-feed.ts";

/**
 * Pure logic behind `npm run prices:check` / `prices:publish` (scripts/update-prices.mjs).
 * Nothing here touches the network or the disk, so all of it is covered by tests.
 */

/** A price that moves more than this against the last feed is held back for a human look. */
export const MAX_JUMP = 0.25;

/** JSON.parse that tolerates the BOM some Windows editors add, and returns an error instead of throwing. */
export function parseJsonText(text: string): { value: unknown; error: null } | { value: null; error: string } {
  try {
    return { value: JSON.parse(text.replace(/^\uFEFF/, "")), error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : "JSON نامعتبر" };
  }
}

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const KNOWN_IDS = new Set(CATALOG.map((item) => item.id));

function normalizeDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[,،٬\s]/g, "");
}

/**
 * Manual prices (`data/prices-manual.csv`): one `id,price[,note]` per line. Blank lines,
 * `#` comments and a header line are skipped. Columns may be split by `,` `;` or a tab. Persian digits and
 * Persian thousands separators (٬ ،) are fine; an ASCII comma can only separate columns.
 */
export function parseManualCsv(text: string): { prices: PriceMap; errors: string[] } {
  const prices: PriceMap = {};
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const row = line.trim();
    if (!row || row.startsWith("#")) return;
    // Excel in some regional settings writes ";" (or tabs) and quotes; accept all of them.
    const [rawId, rawPrice] = row.split(/[,;\t]/).map((part) => part.trim().replace(/^"(.*)"$/, "$1").trim());
    if (rawId.toLowerCase() === "id") return; // header row, even below comment lines
    const where = `prices-manual.csv، خط ${index + 1}`;
    if (!KNOWN_IDS.has(rawId)) {
      errors.push(`${where}: شناسهٔ ناشناخته «${rawId}»`);
      return;
    }
    const price = Number(normalizeDigits(rawPrice ?? ""));
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`${where}: قیمت نامعتبر برای «${rawId}»`);
      return;
    }
    prices[rawId] = Math.round(price);
  });
  return { prices, errors };
}

/* ---------- sources (Digikala product API) ---------- */

export type SourceUnit = "rial" | "toman";
/** `packQty`: how many of the item's purchase unit one pack holds (a 1.8 kg chicken for a kg item = 1.8). */
export type SourceRef = { url: string; packQty: number };
export type Sources = { unit: SourceUnit; items: Record<string, SourceRef[]> };

export function digikalaProductId(url: string): string | null {
  const match = /dkp-(\d+)/.exec(url);
  return match ? match[1] : null;
}

export function parseSources(raw: unknown): { sources: Sources; errors: string[] } {
  const errors: string[] = [];
  const sources: Sources = { unit: "rial", items: {} };
  if (!raw || typeof raw !== "object") {
    return { sources, errors: ["price-sources.json معتبر نیست"] };
  }
  const { unit, items } = raw as Record<string, unknown>;
  if (unit === "toman" || unit === "rial") sources.unit = unit;
  else if (unit !== undefined) errors.push(`unit باید "rial" یا "toman" باشد`);
  if (!items || typeof items !== "object") return { sources, errors: [...errors, "items پیدا نشد"] };
  for (const [id, refs] of Object.entries(items as Record<string, unknown>)) {
    if (!KNOWN_IDS.has(id)) {
      errors.push(`price-sources.json: شناسهٔ ناشناخته «${id}»`);
      continue;
    }
    if (!Array.isArray(refs)) {
      errors.push(`price-sources.json: «${id}» باید آرایه باشد`);
      continue;
    }
    const good: SourceRef[] = [];
    refs.forEach((ref, i) => {
      const { url, packQty } = (ref ?? {}) as Record<string, unknown>;
      if (typeof url !== "string" || !digikalaProductId(url)) {
        errors.push(`price-sources.json: «${id}» مورد ${i + 1}: لینک باید شامل dkp-شماره باشد`);
      } else if (typeof packQty !== "number" || !Number.isFinite(packQty) || packQty <= 0) {
        errors.push(`price-sources.json: «${id}» مورد ${i + 1}: packQty باید عدد مثبت باشد`);
      } else {
        good.push({ url, packQty });
      }
    });
    if (good.length > 0) sources.items[id] = good;
  }
  return { sources, errors };
}

/** `data.product.default_variant.price.selling_price` of a product API response, or null (out of stock, changed shape). */
export function priceFromDigikalaJson(json: unknown): number | null {
  const price = (json as any)?.data?.product?.default_variant?.price?.selling_price;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

/** Raw site price → toman per purchase unit of the item. */
export function toTomanPerUnit(raw: number, unit: SourceUnit, packQty: number): number | null {
  if (!(raw > 0) || !(packQty > 0)) return null;
  const toman = unit === "rial" ? raw / 10 : raw;
  const perUnit = Math.round(toman / packQty);
  return perUnit > 0 ? perUnit : null;
}

/* ---------- building and checking the feed ---------- */

export type Origin = "manual" | "source" | "kept";

/** Manual wins, then what the sources returned, then the price already in the feed. */
export function mergePrices(input: { previous: PriceMap; manual: PriceMap; collected: PriceMap }) {
  const prices: PriceMap = {};
  const origin: Record<string, Origin> = {};
  for (const item of CATALOG) {
    const { id } = item;
    if (input.manual[id] !== undefined) [prices[id], origin[id]] = [input.manual[id], "manual"];
    else if (input.collected[id] !== undefined) [prices[id], origin[id]] = [input.collected[id], "source"];
    else if (input.previous[id] !== undefined) [prices[id], origin[id]] = [input.previous[id], "kept"];
  }
  return { prices: cleanPriceMap(prices), origin };
}

export type PriceChange = { id: string; name: string; before: number | null; after: number; pct: number | null };

/** Items whose price differs from `before` (new items have `before: null`). */
export function diffPrices(before: PriceMap, after: PriceMap): PriceChange[] {
  const changes: PriceChange[] = [];
  for (const item of CATALOG) {
    const next = after[item.id];
    if (next === undefined) continue;
    const prev = before[item.id];
    if (prev === next) continue;
    changes.push({
      id: item.id,
      name: item.name,
      before: prev ?? null,
      after: next,
      pct: prev ? (next - prev) / prev : null,
    });
  }
  return changes;
}

export function bigJumps(changes: PriceChange[], max = MAX_JUMP): PriceChange[] {
  return changes.filter((c) => c.pct !== null && Math.abs(c.pct) > max);
}

/** Today in the local timezone as YYYY-MM-DD (the day the prices were collected). */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type FeedJson = { version: 1; asOf: string; items: PriceMap };

export type UpdatePlan = {
  /** null when nothing changed (nothing to write). */
  feed: FeedJson | null;
  changes: PriceChange[];
  jumps: PriceChange[];
  origin: Record<string, Origin>;
  warnings: string[];
};

export function planUpdate(input: {
  previous: PriceFeed | null;
  manual: PriceMap;
  collected: PriceMap;
  now?: Date;
}): UpdatePlan {
  const now = input.now ?? new Date();
  const previousPrices = input.previous?.prices ?? {};
  const { prices, origin } = mergePrices({ previous: previousPrices, manual: input.manual, collected: input.collected });
  const changes = diffPrices(previousPrices, prices);
  const jumps = bigJumps(changes);
  const warnings: string[] = [];
  const asOf = todayIso(now);
  if (changes.length === 0) return { feed: null, changes, jumps, origin, warnings };

  const feed: FeedJson = { version: 1, asOf, items: prices };
  // The app itself must accept what we are about to publish.
  if (!parsePriceFeed(feed, now)) {
    warnings.push("فید ساخته‌شده از اعتبارسنجی اپ رد شد؛ منتشر نمی‌شود");
    return { feed: null, changes, jumps, origin, warnings };
  }
  if (input.previous && input.previous.asOf >= asOf) {
    warnings.push(
      `فید فعلی هم برای ${input.previous.asOf} است. اپ فقط فیدی را می‌پذیرد که تاریخش جدیدتر باشد؛ کاربرانی که فید امروز را گرفته‌اند تا فردا این تغییر را نمی‌بینند.`,
    );
  }
  return { feed, changes, jumps, origin, warnings };
}
