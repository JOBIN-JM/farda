#!/usr/bin/env node
/**
 * Fetch ONE product page and save the raw response, so an extractor can be fixed from a real sample.
 * One request only, no retry, nothing is written except the dump in data/.debug/.
 *
 *   node --experimental-strip-types scripts/dump-one.mjs oil 2     (item "oil", its 2nd link in data/price-sources.json)
 *   node --experimental-strip-types scripts/dump-one.mjs https://torob.com/p/...   (any URL)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dumpFileName, extractPagePrice, parseJsonText, torobPageSummary, truncateForDump } from "../src/lib/farda/price-update.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = process.env.FARDA_UA ?? "Mozilla/5.0 (compatible; farda-price-check/1.0; personal use)";
const [first, second = "1"] = process.argv.slice(2);

let itemId = "url";
let index = 0;
let url = first;
if (first && !/^https?:\/\//i.test(first)) {
  itemId = first;
  index = Number(second) - 1;
  const { value, error } = parseJsonText(readFileSync(join(ROOT, "data", "price-sources.json"), "utf8"));
  if (error) throw new Error(`data/price-sources.json is not valid JSON: ${error}`);
  url = value?.items?.[itemId]?.[index]?.url;
  if (!url) {
    console.error(`No link number ${second} for "${itemId}" in data/price-sources.json`);
    process.exit(1);
  }
}
if (!url) {
  console.error("Usage: node --experimental-strip-types scripts/dump-one.mjs <item-id> [link-number]   or   <url>");
  process.exit(1);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 20_000);
try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "Accept-Language": "fa-IR,fa;q=0.9", "User-Agent": USER_AGENT },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const { text, truncated } = truncateForDump(body);
  mkdirSync(join(ROOT, "data", ".debug"), { recursive: true });
  const name = dumpFileName(itemId, index, url, /json/i.test(contentType) ? "json" : "html");
  writeFileSync(join(ROOT, "data", ".debug", name), text);

  const has = (re) => (re.test(body) ? "yes" : "no");
  console.log(`HTTP ${response.status} · ${contentType || "no content-type"} · ${body.length} characters${truncated ? " (file cut at 200 KB)" : ""}`);
  console.log(`saved: data/.debug/${name}`);
  console.log(`JSON-LD: ${has(/application\/ld\+json/i)} · __NEXT_DATA__: ${has(/__NEXT_DATA__/)} · product:price meta: ${has(/product:price|og:price/i)} · "price" anywhere: ${has(/price/i)}`);
  const result = extractPagePrice(body);
  console.log(result.ok ? `extractor: found ${result.reading.raw} (${result.reading.method}, currency ${result.reading.currency ?? "none"})` : "extractor: no price found");
  const torob = torobPageSummary(body);
  if (torob) {
    console.log(`Torob page: ${torob.title ?? "(no title)"}`);
    for (const seller of torob.sellers) console.log(`  seller: ${seller.price ?? "?"} | ${seller.item ?? "?"}`);
    if (torob.specs.length > 0) console.log(`  specs: ${torob.specs.map(([k, v]) => `${k}: ${v}`).join(" ; ")}`);
    console.log("  Check the pack type above: if the price is for a carton of 12, set packQty to 12 in data/price-sources.json.");
  }
  if (response.status === 403 || response.status === 429) console.log("The site is blocking requests right now; wait a few hours before trying again.");
} catch (error) {
  console.error(`request failed: ${error?.name === "AbortError" ? "timeout" : error?.message ?? error}`);
  process.exit(1);
} finally {
  clearTimeout(timer);
}
