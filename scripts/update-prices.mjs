#!/usr/bin/env node
/**
 * Update public/prices.json on YOUR machine (your IP, your pace), then let git carry it to the app.
 *
 *   npm run prices:check      look only: fetch, compare, print. Writes nothing.
 *   npm run prices:publish    the same, then write prices.json + git commit + git push.
 *
 * Flags: --write (write the file, no git) · --offline (manual CSV only, no network)
 *        --force (publish even if a price jumped more than 25%) · --any-branch (allow publishing from a non-main branch)
 * With npm, flags go after "--":  npm run prices:publish -- --force   (without "--" npm swallows the flag)
 *
 * Inputs: data/price-sources.json (Digikala product links per item) and data/prices-manual.csv
 * (tariffs and anything you set by hand; manual wins). Needs Node 22.6+.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { restoreFeed } from "../src/lib/farda/price-feed.ts";
import {
  MAX_JUMP,
  digikalaProductId,
  median,
  parseJsonText,
  parseManualCsv,
  parseSources,
  planUpdate,
  priceFromDigikalaJson,
  toTomanPerUnit,
} from "../src/lib/farda/price-update.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FEED_PATH = join(ROOT, "public", "prices.json");
const SOURCES_PATH = join(ROOT, "data", "price-sources.json");
const MANUAL_PATH = join(ROOT, "data", "prices-manual.csv");

const API_BASE = process.env.FARDA_API_BASE ?? "https://api.digikala.com/v1/product/";
const USER_AGENT = process.env.FARDA_UA ?? "Mozilla/5.0 (compatible; farda-price-check/1.0; personal use)";
const FETCH_TIMEOUT_MS = 15_000;

const args = new Set(process.argv.slice(2));
const publish = args.has("--publish");
const write = publish || args.has("--write");
const offline = args.has("--offline");
const force = args.has("--force");

const fmt = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-US"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const delayMs = () => (process.env.FARDA_DELAY_MS ? Number(process.env.FARDA_DELAY_MS) : 3000 + Math.random() * 3000);

class BlockedError extends Error {}

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Read a JSON file; a broken file stops the run with a clear message instead of a stack trace. */
function readJson(path, name) {
  const { value, error } = parseJsonText(readFileSync(path, "utf8"));
  if (error) fail(1, `${name} JSON معتبر نیست (چیزی تغییر نکرد): ${error}`);
  return value;
}

async function fetchProduct(id) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${id}/`, {
      signal: controller.signal,
      headers: { Accept: "application/json", "Accept-Language": "fa-IR,fa;q=0.9", "User-Agent": USER_AGENT },
    });
    // The site is telling us to stop. Stop everything; do not retry and do not publish a half run.
    if (response.status === 403 || response.status === 429) {
      throw new BlockedError(`سایت جواب ${response.status} داد (محدود شدن)`);
    }
    if (!response.ok) return { error: `HTTP ${response.status}` };
    return { json: await response.json() };
  } catch (error) {
    if (error instanceof BlockedError) throw error;
    return { error: error?.name === "AbortError" ? "timeout" : "پاسخ نامعتبر یا قطع شبکه" };
  } finally {
    clearTimeout(timer);
  }
}

async function collect(sources) {
  const collected = {};
  const failed = []; // items that have links but no price this run: they keep their old price
  let first = true;
  for (const [itemId, refs] of Object.entries(sources.items)) {
    const values = [];
    for (const ref of refs) {
      if (!first) await sleep(delayMs());
      first = false;
      const productId = digikalaProductId(ref.url);
      const { json, error } = await fetchProduct(productId);
      if (error) {
        console.log(`  ${itemId}: dkp-${productId} ✗ ${error}`);
        continue;
      }
      const raw = priceFromDigikalaJson(json);
      const perUnit = raw === null ? null : toTomanPerUnit(raw, sources.unit, ref.packQty);
      if (perUnit === null) {
        console.log(`  ${itemId}: dkp-${productId} ✗ قیمت پیدا نشد (ناموجود یا ساختار پاسخ عوض شده)`);
        continue;
      }
      console.log(`  ${itemId}: dkp-${productId} → ${fmt(raw)} ${sources.unit} ÷ ${ref.packQty} = ${fmt(perUnit)} تومان`);
      values.push(perUnit);
    }
    const price = median(values);
    if (price !== null) collected[itemId] = price;
    else failed.push(itemId);
  }
  return { collected, failed };
}

function fail(code, message) {
  console.error(`\n✗ ${message}`);
  process.exit(code);
}

async function main() {
  // Inputs
  const manualFile = existsSync(MANUAL_PATH) ? parseManualCsv(readFileSync(MANUAL_PATH, "utf8")) : { prices: {}, errors: [] };
  let sources = { unit: "rial", items: {} };
  let sourceErrors = [];
  if (!offline && existsSync(SOURCES_PATH)) {
    ({ sources, errors: sourceErrors } = parseSources(readJson(SOURCES_PATH, "data/price-sources.json")));
  }
  const inputErrors = [...manualFile.errors, ...sourceErrors];
  if (inputErrors.length > 0) {
    fail(1, `خطا در فایل‌های ورودی (چیزی تغییر نکرد):\n  - ${inputErrors.join("\n  - ")}`);
  }

  const previousRaw = existsSync(FEED_PATH) ? readJson(FEED_PATH, "public/prices.json") : null;
  const previous = previousRaw ? restoreFeed({ asOf: previousRaw.asOf, prices: previousRaw.items }) : null;

  // Refuse to publish from a random branch before touching anything.
  let branch = "";
  if (publish) {
    branch = git("rev-parse", "--abbrev-ref", "HEAD");
    if (!["main", "master"].includes(branch) && !args.has("--any-branch")) {
      fail(1, `الان روی branch «${branch}» هستی. برای منتشر کردن به main برو، یا با --any-branch اجرا کن.`);
    }
  }

  // Collect
  let collected = {};
  let failed = [];
  const refCount = Object.values(sources.items).reduce((n, refs) => n + refs.length, 0);
  if (!offline && refCount > 0) {
    console.log(`دریافت قیمت ${refCount} کالا (با فاصله بین درخواست‌ها)…`);
    try {
      ({ collected, failed } = await collect(sources));
    } catch (error) {
      if (error instanceof BlockedError) {
        fail(2, `${error.message}. اجرا متوقف شد و چیزی نوشته نشد. چند ساعت صبر کن یا منبع/آی‌پی را عوض کن.`);
      }
      throw error;
    }
  } else if (!offline) {
    console.log("هیچ لینکی در data/price-sources.json نیست؛ فقط CSV دستی خوانده می‌شود.");
  }

  if (failed.length > 0) {
    console.log(`\n⚠ قیمت این اقلام گرفته نشد و قیمت قبلی‌شان می‌ماند (لینک را چک کن): ${failed.join("، ")}`);
  }

  // Plan
  const plan = planUpdate({ previous, manual: manualFile.prices, collected });
  console.log("");
  if (plan.changes.length === 0) {
    console.log("✓ هیچ تغییری نیست؛ prices.json همان می‌ماند.");
    return;
  }
  console.log("تغییرها (قدیم ← جدید):");
  for (const c of plan.changes) {
    const pct = c.pct === null ? "جدید" : `${c.pct > 0 ? "+" : ""}${(c.pct * 100).toFixed(1)}%`;
    const flag = plan.jumps.includes(c) ? "  ⚠ جهش زیاد" : "";
    console.log(`  ${c.id.padEnd(9)} ${fmt(c.before).padStart(10)} ← ${fmt(c.after).padStart(10)}  ${pct.padStart(7)}  [${plan.origin[c.id]}]${flag}`);
  }
  for (const w of plan.warnings) console.log(`\n⚠ ${w}`);

  if (!plan.feed) fail(1, "فید معتبر ساخته نشد.");
  if (plan.jumps.length > 0 && !force) {
    console.log(`\n⚠ ${plan.jumps.length} قیمت بیش از ${MAX_JUMP * 100}٪ عوض شده.`);
    if (write) fail(3, "نوشتن متوقف شد. اگر مطمئنی درست است، دوباره با --force اجرا کن.");
  }
  if (!write) {
    console.log("\n(فقط نمایش؛ چیزی نوشته نشد. برای انتشار: npm run prices:publish)");
    return;
  }

  // Write (atomically: the old file or the new one, never half)
  const tmp = `${FEED_PATH}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(plan.feed, null, 2)}\n`);
  renameSync(tmp, FEED_PATH);
  console.log(`\n✓ public/prices.json نوشته شد (asOf ${plan.feed.asOf}).`);
  if (!publish) return;

  try {
    git("add", "public/prices.json");
    git("commit", "-m", `chore(prices): ${plan.feed.asOf}`, "--", "public/prices.json");
    console.log("✓ commit شد.");
    git("push");
    console.log(`✓ push شد (${branch}). بعد از دیپلوی، اپ قیمت جدید را می‌گیرد.`);
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error).trim();
    fail(4, `git ناموفق بود:\n${detail}\nفایل نوشته شده؛ بعد از رفع مشکل خودت git push بزن.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
