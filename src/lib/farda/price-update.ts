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
    return { value: null, error: error instanceof Error ? error.message : "invalid JSON" };
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
    const where = `prices-manual.csv, line ${index + 1}`;
    if (!KNOWN_IDS.has(rawId)) {
      errors.push(`${where}: unknown id "${rawId}"`);
      return;
    }
    const price = Number(normalizeDigits(rawPrice ?? ""));
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`${where}: invalid price for "${rawId}"`);
      return;
    }
    prices[rawId] = Math.round(price);
  });
  return { prices, errors };
}

/* ---------- sources (Digikala API, Marketban / Torob pages) ---------- */

export type SourceUnit = "rial" | "toman";
export type SourceSite = "digikala" | "marketban" | "torob";
/**
 * `packQty`: how many of the item's purchase unit one pack holds (a 1.8 kg chicken for a kg item = 1.8).
 * `unit` (optional) beats the file-wide `unit` for this one link. `site` is derived from the hostname.
 */
export type SourceRef = { url: string; packQty: number; site: SourceSite; unit?: SourceUnit };
export type Sources = { unit: SourceUnit; items: Record<string, SourceRef[]> };

const SITE_HOSTS: Record<SourceSite, string> = {
  digikala: "digikala.com",
  marketban: "marketban.com",
  torob: "torob.com",
};

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Which supported site a link belongs to (by hostname: `www.torob.com` yes, `torob.com.evil.io` no). */
export function siteFromUrl(url: string): SourceSite | null {
  const host = hostOf(url);
  if (!host) return null;
  for (const [site, base] of Object.entries(SITE_HOSTS)) {
    if (host === base || host.endsWith(`.${base}`)) return site as SourceSite;
  }
  return null;
}

export function digikalaProductId(url: string): string | null {
  const match = /dkp-(\d+)/.exec(url);
  return match ? match[1] : null;
}

/** Short id for log lines: `dkp-123`, `mkb-5205932`, `torob:54977909`. */
export function refLabel(ref: Pick<SourceRef, "url" | "site">): string {
  if (ref.site === "digikala") return `dkp-${digikalaProductId(ref.url) ?? "?"}`;
  if (ref.site === "marketban") {
    const match = /\/mkb-([A-Za-z0-9]+)/.exec(ref.url);
    return match ? `mkb-${match[1]}` : "marketban";
  }
  const match = /\/p\/([0-9a-fA-F]{8})[0-9a-fA-F-]*/.exec(ref.url);
  return match ? `torob:${match[1]}` : "torob";
}

export function parseSources(raw: unknown): { sources: Sources; errors: string[] } {
  const errors: string[] = [];
  const sources: Sources = { unit: "rial", items: {} };
  if (!raw || typeof raw !== "object") {
    return { sources, errors: ["price-sources.json is not valid"] };
  }
  const { unit, items } = raw as Record<string, unknown>;
  if (unit === "toman" || unit === "rial") sources.unit = unit;
  else if (unit !== undefined) errors.push(`unit must be "rial" or "toman"`);
  if (!items || typeof items !== "object") return { sources, errors: [...errors, "items not found"] };
  for (const [id, refs] of Object.entries(items as Record<string, unknown>)) {
    if (!KNOWN_IDS.has(id)) {
      errors.push(`price-sources.json: unknown id "${id}"`);
      continue;
    }
    if (!Array.isArray(refs)) {
      errors.push(`price-sources.json: "${id}" must be an array`);
      continue;
    }
    const good: SourceRef[] = [];
    refs.forEach((ref, i) => {
      const { url, packQty, unit: refUnit } = (ref ?? {}) as Record<string, unknown>;
      const where = `price-sources.json: "${id}" entry ${i + 1}`;
      const problems: string[] = [];
      let site: SourceSite | null = null;
      if (typeof url !== "string" || hostOf(url) === null) {
        problems.push(`${where}: the link is not valid (it must start with https://)`);
      } else {
        site = siteFromUrl(url);
        if (!site) {
          problems.push(`${where}: unknown site "${hostOf(url)}" (only digikala.com, marketban.com and torob.com)`);
        } else if (site === "digikala" && !digikalaProductId(url)) {
          problems.push(`${where}: a Digikala link must contain dkp-<number>`);
        }
      }
      if (typeof packQty !== "number" || !Number.isFinite(packQty) || packQty <= 0) {
        problems.push(`${where}: packQty must be a positive number`);
      }
      if (refUnit !== undefined && refUnit !== "rial" && refUnit !== "toman") {
        problems.push(`${where}: unit must be "rial" or "toman"`);
      }
      if (problems.length > 0) {
        errors.push(...problems);
        return;
      }
      const entry: SourceRef = { url: url as string, packQty: packQty as number, site: site as SourceSite };
      if (refUnit === "rial" || refUnit === "toman") entry.unit = refUnit;
      good.push(entry);
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

/** Raw site price → toman (before dividing by the pack size). */
export function rawToToman(raw: number, unit: SourceUnit): number {
  return unit === "rial" ? raw / 10 : raw;
}

/** Raw site price → toman per purchase unit of the item. */
export function toTomanPerUnit(raw: number, unit: SourceUnit, packQty: number): number | null {
  if (!(raw > 0) || !(packQty > 0)) return null;
  const perUnit = Math.round(rawToToman(raw, unit) / packQty);
  return perUnit > 0 ? perUnit : null;
}

/* ---------- reading a price out of a product page (Marketban, Torob) ---------- */

export type ExtractMethod = "json-ld" | "next-data" | "meta";

/** What one extraction method found: the first price, every offer price on the page, and the currency code if the page states one. */
export type PageReading = { raw: number; offers: number[]; currency: string | null; method: ExtractMethod };

export type ExtractResult = { ok: true; reading: PageReading } | { ok: false; tried: string[] };

/** A number, or a string of (Persian) digits with separators, as a positive amount; anything else is null. */
function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const digits = normalizeDigits(value);
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  const n = Number(digits);
  return n > 0 ? n : null;
}

/** `IRR` → rial, `IRT` / `TOMAN` → toman, anything else (or nothing) → null. Never guesses. */
export function unitFromCurrency(code: unknown): SourceUnit | null {
  if (typeof code !== "string") return null;
  const c = code.trim().toUpperCase();
  if (c === "IRR") return "rial";
  if (c === "IRT" || c === "TOMAN") return "toman";
  return null;
}

const asString = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/* (a) JSON-LD */

function typeIsProduct(type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && /(^|[/#])product$/i.test(t.trim()));
}

function* ldNodes(value: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(value)) {
    for (const v of value) yield* ldNodes(v);
  } else if (isObject(value)) {
    yield value;
    if (Array.isArray(value["@graph"])) yield* ldNodes(value["@graph"]);
  }
}

/** Offer prices (and the first currency) of an `offers` value: an Offer, an array of them, or an AggregateOffer. */
function collectOffers(offers: unknown, acc: { prices: number[]; currency: string | null }): void {
  if (Array.isArray(offers)) {
    for (const o of offers) collectOffers(o, acc);
    return;
  }
  if (!isObject(offers)) return;
  acc.currency ??= asString(offers.priceCurrency);
  if (Array.isArray(offers.offers) && offers.offers.length > 0) {
    collectOffers(offers.offers, acc); // an AggregateOffer that lists its offers: use those, not lowPrice
    return;
  }
  const price = parseAmount(offers.price) ?? parseAmount(offers.lowPrice);
  if (price !== null) acc.prices.push(price);
}

function fromJsonLd(html: string): PageReading | null {
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const { value } = parseJsonText(match[1].trim());
    if (value === null) continue;
    for (const node of ldNodes(value)) {
      if (!typeIsProduct(node["@type"])) continue;
      const acc = { prices: [] as number[], currency: null as string | null };
      collectOffers(node.offers, acc);
      if (acc.prices.length > 0) {
        return { raw: acc.prices[0], offers: acc.prices, currency: acc.currency, method: "json-ld" };
      }
    }
  }
  return null;
}

/* (b) embedded JSON (__NEXT_DATA__) */

const NEXT_DATA_PRICE_KEYS = ["price", "final_price", "selling_price", "sale_price", "min_price", "lowest_price", "lowPrice"];
const NEXT_DATA_CURRENCY_KEYS = ["priceCurrency", "currency", "currency_code"];
const PRODUCT_KEY = /product/i;
const NOT_THE_PRODUCT_KEY = /(related|similar|recommend|suggest|other|alternative|sponsor|ads?$)/i;

/**
 * Heuristic: the first object, in document order, that sits under a key containing "product" (not "related products" and
 * the like) and has a positive price-like field. The real shape of these sites' data was never seen; --debug-dump exists to fix this.
 */
function fromNextData(html: string): PageReading | null {
  const match = /<script\b[^>]*\bid\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return null;
  const { value } = parseJsonText(match[1].trim());
  if (value === null) return null;
  let visited = 0;
  const walk = (node: unknown, inProduct: boolean, depth: number): PageReading | null => {
    if (depth > 14 || visited++ > 50_000) return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child, inProduct, depth + 1);
        if (found) return found;
      }
      return null;
    }
    if (!isObject(node)) return null;
    if (inProduct) {
      for (const key of NEXT_DATA_PRICE_KEYS) {
        const price = parseAmount(node[key]);
        if (price === null) continue;
        let currency: string | null = null;
        for (const ckey of NEXT_DATA_CURRENCY_KEYS) currency ??= asString(node[ckey]);
        return { raw: price, offers: [price], currency, method: "next-data" };
      }
    }
    for (const [key, child] of Object.entries(node)) {
      if (NOT_THE_PRODUCT_KEY.test(key)) continue;
      const found = walk(child, inProduct || PRODUCT_KEY.test(key), depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(value, false, 0);
}

/* (c) meta tags */

function metaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const a of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? "";
    }
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? "").toLowerCase();
    if (key && attrs.content !== undefined && !tags.has(key)) tags.set(key, attrs.content);
  }
  return tags;
}

function fromMeta(html: string): PageReading | null {
  const tags = metaTags(html);
  for (const key of ["product:price:amount", "og:price:amount", "og:price"]) {
    const price = parseAmount(tags.get(key));
    if (price === null) continue;
    const currency = asString(tags.get("product:price:currency")) ?? asString(tags.get("og:price:currency"));
    return { raw: price, offers: [price], currency, method: "meta" };
  }
  return null;
}

/** Tries JSON-LD, then embedded JSON, then meta tags; the first valid price wins. */
export function extractPagePrice(html: string): ExtractResult {
  const attempts: [string, (h: string) => PageReading | null][] = [
    ["JSON-LD (Product and offers)", fromJsonLd],
    ["embedded JSON (__NEXT_DATA__)", fromNextData],
    ["meta tags (product:price:amount / og:price)", fromMeta],
  ];
  const tried: string[] = [];
  for (const [label, run] of attempts) {
    const reading = run(html);
    if (reading) return { ok: true, reading };
    tried.push(`${label}: no price found`);
  }
  return { ok: false, tried };
}

export type UnitSource = "page-currency" | "ref-unit" | "global-unit";

export type RefOutcome =
  | {
      ok: true;
      raw: number;
      unit: SourceUnit;
      unitSource: UnitSource;
      /** The currency code the page stated (e.g. "IRR"), if any. */
      currencyCode: string | null;
      toman: number;
      perUnit: number;
      method: ExtractMethod | "digikala-api";
      /** The price is an aggregate (Torob's cheapest/median seller, or the cheapest of several offers), not one shop's price. */
      aggregated: boolean;
      /** "median" of the page's offers, "lowest" (cheapest), or "single". */
      kind: "median" | "lowest" | "single";
      offerCount: number;
      warnings: string[];
    }
  | { ok: false; reason: string; tried: string[] };

function resolveUnit(
  currency: string | null,
  ref: Pick<SourceRef, "unit">,
  globalUnit: SourceUnit,
): { unit: SourceUnit; unitSource: UnitSource; warnings: string[] } {
  const fromPage = unitFromCurrency(currency);
  const warnings: string[] = [];
  if (fromPage) return { unit: fromPage, unitSource: "page-currency", warnings };
  if (currency) warnings.push(`the page's currency code ("${currency}") is not recognized; the configured unit was used`);
  if (ref.unit) return { unit: ref.unit, unitSource: "ref-unit", warnings };
  return { unit: globalUnit, unitSource: "global-unit", warnings };
}

/**
 * Price of one Marketban / Torob page, in toman per purchase unit. Unit: the page's own currency code if it has one,
 * else this link's `unit`, else the file-wide `unit`. Torob's page price is "cheapest seller": with a list of offers
 * we take the median, and either way the result is marked aggregated.
 */
export function priceFromPage(
  html: string,
  ref: Pick<SourceRef, "site" | "packQty" | "unit">,
  globalUnit: SourceUnit,
): RefOutcome {
  const extracted = extractPagePrice(html);
  if (!extracted.ok) {
    return {
      ok: false,
      tried: extracted.tried,
      reason:
        `No price found on the page. Methods tried: ${extracted.tried.join("; ")}. ` +
        "The page may need JavaScript to show its price (or a protection/captcha page was returned). " +
        "Run with --debug-dump to save the response and send the sample so the extractor can be fixed.",
    };
  }
  const { reading } = extracted;
  const offerCount = reading.offers.length;
  let raw = reading.raw;
  let kind: "median" | "lowest" | "single" = "single";
  if (offerCount >= 2) {
    if (ref.site === "torob") {
      raw = median(reading.offers) as number;
      kind = "median";
    } else {
      raw = Math.min(...reading.offers);
      kind = "lowest";
    }
  } else if (ref.site === "torob") {
    kind = "lowest"; // a single number on a Torob page is already "cheapest seller"
  }
  const { unit, unitSource, warnings } = resolveUnit(reading.currency, ref, globalUnit);
  const perUnit = toTomanPerUnit(raw, unit, ref.packQty);
  if (perUnit === null) return { ok: false, tried: [], reason: "the price could not be converted (invalid packQty or price)" };
  return {
    ok: true,
    raw,
    unit,
    unitSource,
    currencyCode: reading.currency,
    toman: rawToToman(raw, unit),
    perUnit,
    method: reading.method,
    aggregated: kind !== "single" || ref.site === "torob",
    kind,
    offerCount,
    warnings,
  };
}

/** Price of one Digikala API response. The API has no currency field: this link's `unit`, else the file-wide `unit`. */
export function priceFromDigikala(
  json: unknown,
  ref: Pick<SourceRef, "packQty" | "unit">,
  globalUnit: SourceUnit,
): RefOutcome {
  const raw = priceFromDigikalaJson(json);
  const unit = ref.unit ?? globalUnit;
  const perUnit = raw === null ? null : toTomanPerUnit(raw, unit, ref.packQty);
  if (raw === null || perUnit === null) {
    return { ok: false, tried: [], reason: "no price found (out of stock, or the response shape changed)" };
  }
  return {
    ok: true,
    raw,
    unit,
    unitSource: ref.unit ? "ref-unit" : "global-unit",
    currencyCode: null,
    toman: rawToToman(raw, unit),
    perUnit,
    method: "digikala-api",
    aggregated: false,
    kind: "single",
    offerCount: 1,
    warnings: [],
  };
}

/** One-line Persian note when the price is an aggregate, else null. */
export function aggregateNote(outcome: RefOutcome): string | null {
  if (!outcome.ok || !outcome.aggregated) return null;
  if (outcome.kind === "median") return `aggregate: median of ${outcome.offerCount} offers`;
  if (outcome.kind === "lowest" && outcome.offerCount >= 2) return `aggregate: cheapest of ${outcome.offerCount} offers`;
  return "aggregate: cheapest seller";
}

/* ---------- cache of fetched prices (so re-runs and a 429 do not cost more requests) ---------- */

export type OkOutcome = Extract<RefOutcome, { ok: true }>;

export type CacheEntry = {
  /** ISO timestamp of the request that produced this price. */
  fetchedAt: string;
  /** What the result depends on besides the link: a change to any of these makes the entry a miss. */
  packQty: number;
  refUnit: SourceUnit | null;
  globalUnit: SourceUnit;
  outcome: OkOutcome;
};

export type PriceCache = {
  version: 1;
  /** Keyed by the link's URL. Only successful readings are cached, never failures. */
  entries: Record<string, CacheEntry>;
  /** The last time a site told us to stop (403/429). Later runs stay away from the network for a while. */
  blocked: { at: string; status: number } | null;
};

export const DEFAULT_CACHE_HOURS = 12;
export const DEFAULT_COOLDOWN_HOURS = 6;
const CACHE_KEEP_MS = 14 * 24 * 3600 * 1000;

export const emptyCache = (): PriceCache => ({ version: 1, entries: {}, blocked: null });

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const isUnit = (v: unknown): v is SourceUnit => v === "rial" || v === "toman";
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const UNIT_SOURCES: readonly unknown[] = ["page-currency", "ref-unit", "global-unit"];
const METHODS: readonly unknown[] = ["json-ld", "next-data", "meta", "digikala-api"];
const KINDS: readonly unknown[] = ["median", "lowest", "single"];

/** A successful outcome read back from disk, or null if anything about it looks wrong. */
export function cleanOutcome(value: unknown): OkOutcome | null {
  if (!isObject(value) || value.ok !== true) return null;
  const v = value;
  if (!positive(v.raw) || !positive(v.toman) || !positive(v.perUnit)) return null;
  if (!isUnit(v.unit) || !UNIT_SOURCES.includes(v.unitSource) || !METHODS.includes(v.method) || !KINDS.includes(v.kind)) {
    return null;
  }
  if (typeof v.aggregated !== "boolean") return null;
  if (typeof v.offerCount !== "number" || !Number.isInteger(v.offerCount) || v.offerCount < 1) return null;
  if (v.currencyCode !== null && typeof v.currencyCode !== "string") return null;
  if (!Array.isArray(v.warnings) || !v.warnings.every((w) => typeof w === "string")) return null;
  return {
    ok: true,
    raw: v.raw,
    unit: v.unit,
    unitSource: v.unitSource as UnitSource,
    currencyCode: v.currencyCode,
    toman: v.toman,
    perUnit: v.perUnit,
    method: v.method as OkOutcome["method"],
    aggregated: v.aggregated,
    kind: v.kind as OkOutcome["kind"],
    offerCount: v.offerCount,
    warnings: v.warnings as string[],
  };
}

/** Whatever was on disk → a valid cache. Bad entries are dropped; a broken file gives an empty cache. */
export function parseCache(value: unknown): PriceCache {
  const cache = emptyCache();
  if (!isObject(value) || value.version !== 1) return cache;
  if (isObject(value.entries)) {
    for (const [url, entry] of Object.entries(value.entries)) {
      if (!isObject(entry) || !isIso(entry.fetchedAt) || !positive(entry.packQty) || !isUnit(entry.globalUnit)) continue;
      if (entry.refUnit !== null && !isUnit(entry.refUnit)) continue;
      const outcome = cleanOutcome(entry.outcome);
      if (!outcome) continue;
      cache.entries[url] = {
        fetchedAt: entry.fetchedAt,
        packQty: entry.packQty,
        refUnit: entry.refUnit,
        globalUnit: entry.globalUnit,
        outcome,
      };
    }
  }
  const blocked = value.blocked;
  if (isObject(blocked) && isIso(blocked.at) && typeof blocked.status === "number") {
    cache.blocked = { at: blocked.at, status: blocked.status };
  }
  return cache;
}

/** The cached reading for this link if it is fresh and was made with the same pack size and units. */
export function cacheLookup(
  cache: PriceCache,
  ref: Pick<SourceRef, "url" | "packQty" | "unit">,
  globalUnit: SourceUnit,
  now: Date,
  maxAgeHours = DEFAULT_CACHE_HOURS,
): { outcome: OkOutcome; fetchedAt: string; ageMs: number } | null {
  const entry = cache.entries[ref.url];
  if (!entry) return null;
  if (entry.packQty !== ref.packQty || entry.refUnit !== (ref.unit ?? null) || entry.globalUnit !== globalUnit) return null;
  const ageMs = now.getTime() - Date.parse(entry.fetchedAt);
  if (ageMs < 0 || ageMs > maxAgeHours * 3600 * 1000) return null; // too old, or the clock went backwards
  return { outcome: entry.outcome, fetchedAt: entry.fetchedAt, ageMs };
}

/** A new cache with this reading added (and entries older than two weeks dropped). A success also clears the block marker. */
export function cacheStore(
  cache: PriceCache,
  ref: Pick<SourceRef, "url" | "packQty" | "unit">,
  globalUnit: SourceUnit,
  outcome: OkOutcome,
  now: Date,
): PriceCache {
  const entries: Record<string, CacheEntry> = {};
  for (const [url, entry] of Object.entries(cache.entries)) {
    if (now.getTime() - Date.parse(entry.fetchedAt) <= CACHE_KEEP_MS) entries[url] = entry;
  }
  entries[ref.url] = { fetchedAt: now.toISOString(), packQty: ref.packQty, refUnit: ref.unit ?? null, globalUnit, outcome };
  return { version: 1, entries, blocked: null };
}

export function markBlocked(cache: PriceCache, status: number, now: Date): PriceCache {
  return { ...cache, blocked: { at: now.toISOString(), status } };
}

/** Whether a recent 403/429 means we should still keep off the network, and until when. */
export function blockCooldown(
  cache: PriceCache,
  now: Date,
  hours = DEFAULT_COOLDOWN_HOURS,
): { active: false } | { active: true; at: string; until: string; status: number } {
  if (!cache.blocked) return { active: false };
  const until = Date.parse(cache.blocked.at) + hours * 3600 * 1000;
  if (!(now.getTime() < until)) return { active: false };
  return { active: true, at: cache.blocked.at, until: new Date(until).toISOString(), status: cache.blocked.status };
}

/** "<1 min", "25 min", "3 h 12 min", "5 days". */
export function formatAge(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} days`;
}

/* ---------- debug dumps ---------- */

export const DEBUG_DUMP_MAX_BYTES = 200 * 1024;

/** The first `maxBytes` bytes (UTF-8) of a response; a character cut in half at the end is dropped. */
export function truncateForDump(text: string, maxBytes = DEBUG_DUMP_MAX_BYTES): { text: string; truncated: boolean } {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= maxBytes) return { text, truncated: false };
  const cut = new TextDecoder("utf-8").decode(bytes.subarray(0, maxBytes)).replace(/\uFFFD+$/, "");
  return { text: cut, truncated: true };
}

/** `milk-1-marketban.com.html`: safe on every filesystem, and tells which item and link it came from. */
export function dumpFileName(itemId: string, index: number, url: string, ext: "html" | "json"): string {
  const host = (hostOf(url) ?? "unknown").replace(/^www\./, "");
  const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9.-]+/g, "_");
  return `${safe(itemId)}-${index + 1}-${safe(host)}.${ext}`;
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
    warnings.push("the feed that was built failed the app's own validation; it will not be published");
    return { feed: null, changes, jumps, origin, warnings };
  }
  if (input.previous && input.previous.asOf >= asOf) {
    warnings.push(
      `The current feed is already dated ${input.previous.asOf}. The app only accepts a feed with a newer date, so users who already fetched today's feed will not see this change until tomorrow.`,
    );
  }
  return { feed, changes, jumps, origin, warnings };
}
