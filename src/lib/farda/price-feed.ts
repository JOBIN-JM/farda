import { CATALOG, MAX_ITEM_PRICE, type PriceMap } from "./catalog.ts";

/**
 * Feed format (`public/prices.json`, version 1):
 *
 *   { "version": 1, "asOf": "2026-11-14", "items": { "milk": 140000, ... } }
 *
 * `asOf` is an ISO date (the day the prices were collected) and is what decides
 * whether a feed is newer than the one the app already has. Items missing from
 * the feed simply fall back to the catalog price.
 */
export type PriceFeed = {
  asOf: string;
  prices: PriceMap;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Keep only known catalog ids with a finite, positive, sane price. */
export function cleanPriceMap(raw: unknown): PriceMap {
  const clean: PriceMap = {};
  if (!raw || typeof raw !== "object") return clean;
  for (const item of CATALOG) {
    const value = (raw as Record<string, unknown>)[item.id];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const price = Math.min(MAX_ITEM_PRICE, Math.round(value));
    if (price > 0) clean[item.id] = price;
  }
  return clean;
}

function validAsOf(asOf: unknown, now: Date): asOf is string {
  if (typeof asOf !== "string" || !ISO_DAY.test(asOf)) return false;
  const time = Date.parse(`${asOf}T00:00:00Z`);
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== asOf) return false;
  // A date far in the future would block every real update that follows it.
  return time <= now.getTime() + 2 * DAY_MS;
}

/** Validate a downloaded feed. Returns null for anything that should be ignored. */
export function parsePriceFeed(raw: unknown, now = new Date()): PriceFeed | null {
  if (!raw || typeof raw !== "object") return null;
  const { version, asOf, items } = raw as Record<string, unknown>;
  if (version !== 1 || !validAsOf(asOf, now)) return null;
  const prices = cleanPriceMap(items);
  return Object.keys(prices).length > 0 ? { asOf, prices } : null;
}

/** Restore a feed we saved earlier (no clock check: it was valid when stored). */
export function restoreFeed(raw: unknown): PriceFeed | null {
  if (!raw || typeof raw !== "object") return null;
  const { asOf, prices } = raw as Record<string, unknown>;
  if (typeof asOf !== "string" || !ISO_DAY.test(asOf)) return null;
  const clean = cleanPriceMap(prices);
  return Object.keys(clean).length > 0 ? { asOf, prices: clean } : null;
}

export function isNewerFeed(next: PriceFeed, current: PriceFeed | null): boolean {
  return !current || next.asOf > current.asOf;
}
