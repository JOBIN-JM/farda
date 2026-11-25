#!/usr/bin/env node
/**
 * Update public/prices.json on YOUR machine (your IP, your pace), then let git carry it to the app.
 *
 *   npm run prices:check      look only: fetch, compare, print. Writes nothing.
 *   npm run prices:publish    the same, then write prices.json + git commit + git push.
 *
 * Flags: --write (write the file, no git) · --offline (manual CSV only, no network)
 *        --force (publish even if a price jumped more than 25%) · --any-branch (allow publishing from a non-main branch)
 *        --debug-dump (save each raw response, first 200 KB, in data/.debug/ so an extractor can be fixed from a real sample;
 *                      implies --refresh)
 *        --refresh (ignore cached prices and fetch every link again) · --ignore-cooldown (send requests even right after a 403/429)
 *
 * Cache: every price read successfully is kept in data/.cache/price-cache.json for 12 hours (FARDA_CACHE_HOURS), so running
 * check and then publish, or re-running after an interruption, only fetches what is missing. After a 403/429 no request
 * is sent for 6 hours (FARDA_COOLDOWN_HOURS); prices already in the cache are still used.
 * With npm, flags go after "--":  npm run prices:publish -- --force   (without "--" npm swallows the flag)
 *
 * Inputs: data/price-sources.json (product links per item: digikala.com, marketban.com or torob.com) and data/prices-manual.csv
 * (tariffs and anything you set by hand; manual wins). Needs Node 22.6+.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { restoreFeed } from "../src/lib/farda/price-feed.ts";
import {
  MAX_JUMP,
  DEFAULT_CACHE_HOURS,
  DEFAULT_COOLDOWN_HOURS,
  aggregateNote,
  blockCooldown,
  cacheLookup,
  cacheStore,
  decodeTextFile,
  digikalaProductId,
  dumpFileName,
  emptyCache,
  formatAge,
  markBlocked,
  median,
  parseCache,
  parseJsonText,
  parseManualCsv,
  parseSources,
  planUpdate,
  priceFromDigikala,
  priceFromPage,
  refLabel,
  siteFromUrl,
  truncateForDump,
} from "../src/lib/farda/price-update.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FEED_PATH = join(ROOT, "public", "prices.json");
const SOURCES_PATH = join(ROOT, "data", "price-sources.json");
const MANUAL_PATH = join(ROOT, "data", "prices-manual.csv");
const DEBUG_DIR = join(ROOT, "data", ".debug");
const CACHE_PATH = join(ROOT, "data", ".cache", "price-cache.json");

const API_BASE = process.env.FARDA_API_BASE ?? "https://api.digikala.com/v1/product/";
const USER_AGENT = process.env.FARDA_UA ?? "Mozilla/5.0 (compatible; farda-price-check/1.0; personal use)";
const FETCH_TIMEOUT_MS = 15_000;

const args = new Set(process.argv.slice(2));
const publish = args.has("--publish");
const write = publish || args.has("--write");
const offline = args.has("--offline");
const force = args.has("--force");
const debugDump = args.has("--debug-dump");
const refresh = args.has("--refresh") || debugDump; // a dump needs the real response, not a cached number
const ignoreCooldown = args.has("--ignore-cooldown");
const hoursFromEnv = (name, fallback) => (Number(process.env[name]) > 0 ? Number(process.env[name]) : fallback);
const CACHE_HOURS = hoursFromEnv("FARDA_CACHE_HOURS", DEFAULT_CACHE_HOURS);
const COOLDOWN_HOURS = hoursFromEnv("FARDA_COOLDOWN_HOURS", DEFAULT_COOLDOWN_HOURS);

const fmt = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-US"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const delayMs = () => (process.env.FARDA_DELAY_MS ? Number(process.env.FARDA_DELAY_MS) : 3000 + Math.random() * 3000);

class BlockedError extends Error {
  constructor(message, status, site) {
    super(message);
    this.status = status;
    this.site = site;
  }
}

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Read a JSON file; a broken file stops the run with a clear message instead of a stack trace. */
function readJson(path, name) {
  const { value, error } = parseJsonText(decodeTextFile(readFileSync(path)));
  if (error) fail(1, `${name} is not valid JSON (nothing was changed): ${error}`);
  return value;
}

const UNIT_LABEL = { rial: "rial", toman: "toman" };
const UNIT_SOURCE_LABEL = {
  "page-currency": (code) => `unit from the page: ${code}`,
  "ref-unit": () => "unit from this link",
  "global-unit": () => "unit from the file-wide setting",
};
const METHOD_LABEL = { "json-ld": "JSON-LD", "next-data": "__NEXT_DATA__", meta: "meta tags", "digikala-api": "Digikala API" };

/** Save the raw response (first 200 KB) for --debug-dump. A disk problem here must not stop the run. */
function dumpResponse(itemId, index, ref, contentType, body) {
  if (!debugDump || typeof body !== "string") return;
  try {
    const { text, truncated } = truncateForDump(body);
    const name = dumpFileName(itemId, index, ref.url, /json/i.test(contentType) ? "json" : "html");
    mkdirSync(DEBUG_DIR, { recursive: true });
    writeFileSync(join(DEBUG_DIR, name), text);
    console.log(`    ↳ data/.debug/${name}${truncated ? " (cut at 200 KB)" : ""}`);
  } catch (error) {
    console.log(`    ↳ could not save the debug dump: ${error?.message ?? error}`);
  }
}

/**
 * fetch() follows redirects without telling us. A link that now lands on another site, or on a home page, is not the
 * product any more, and whatever the page shows must not be read as its price.
 */
function redirectProblem(ref, requestedUrl, finalUrl) {
  if (!finalUrl) return null;
  try {
    const final = new URL(finalUrl);
    if (siteFromUrl(finalUrl) !== ref.site) return `redirected to another site (${final.hostname})`;
    if (final.pathname === "/" && new URL(requestedUrl).pathname !== "/") return "redirected to the home page (product removed?)";
  } catch {
    return null;
  }
  return null;
}

/** One GET, no retry. Digikala: its product API (JSON). Marketban / Torob: the product page itself (HTML). */
async function fetchRef(itemId, index, ref) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const isApi = ref.site === "digikala";
  const url = isApi ? `${API_BASE}${digikalaProductId(ref.url)}/` : ref.url;
  const accept = isApi ? "application/json" : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5";
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: accept, "Accept-Language": "fa-IR,fa;q=0.9", "User-Agent": USER_AGENT },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    dumpResponse(itemId, index, ref, contentType, body);
    // The site is telling us to stop. Stop everything; do not retry and do not publish a half run.
    if (response.status === 403 || response.status === 429) {
      throw new BlockedError(`${ref.site} answered ${response.status} (rate limited / blocked)`, response.status, ref.site);
    }
    if (!response.ok) return { error: `HTTP ${response.status}` };
    const moved = redirectProblem(ref, url, response.url);
    if (moved) return { error: moved };
    return { body };
  } catch (error) {
    if (error instanceof BlockedError) throw error;
    return { error: error?.name === "AbortError" ? "timeout" : "invalid response or network error" };
  } finally {
    clearTimeout(timer);
  }
}

/** A readable line with BOTH the raw number and the converted one, so the unit is never a silent guess. */
function describeOutcome(itemId, ref, outcome, extra = null) {
  const fixed = (n) => (Number.isInteger(n) ? fmt(n) : fmt(Math.round(n * 100) / 100));
  const unitNote = UNIT_SOURCE_LABEL[outcome.unitSource](outcome.currencyCode);
  const parts = [
    `${itemId}: ${refLabel(ref)} → raw ${fmt(outcome.raw)} ${UNIT_LABEL[outcome.unit]} (${unitNote}; ${METHOD_LABEL[outcome.method]})`,
    `= ${fixed(outcome.toman)} toman ÷ ${ref.packQty} = ${fmt(outcome.perUnit)} toman/unit`,
  ];
  const note = aggregateNote(outcome);
  if (note) parts.push(`[${note}]`);
  if (extra) parts.push(`[${extra}]`);
  return `  ${parts.join(" ")}${outcome.warnings.map((w) => `\n    ⚠ ${w}`).join("")}`;
}

const when = (iso) => new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });

function loadCache() {
  if (!existsSync(CACHE_PATH)) return emptyCache();
  const { value, error } = parseJsonText(readFileSync(CACHE_PATH, "utf8"));
  if (error) {
    console.log(`⚠ data/.cache/price-cache.json is not valid JSON; starting with an empty cache (${error})`);
    return emptyCache();
  }
  return parseCache(value);
}

/** Written after every change, so a run that is stopped halfway (429, Ctrl+C) still keeps what it fetched. */
function saveCache(cache) {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    const tmp = `${CACHE_PATH}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(cache, null, 2)}\n`);
    renameSync(tmp, CACHE_PATH);
  } catch (error) {
    console.log(`    ↳ could not save the price cache: ${error?.message ?? error}`);
  }
}

async function collect(sources, startCache) {
  let cache = startCache;
  const collected = {};
  const failed = []; // items that have links but no price this run: they keep their old price
  const partial = []; // items priced from fewer links than configured: the median rests on less data
  let requested = false; // pauses only go between real requests, not before a cache hit
  for (const [itemId, refs] of Object.entries(sources.items)) {
    const values = [];
    for (const [index, ref] of refs.entries()) {
      const label = refLabel(ref);
      const hit = refresh ? null : cacheLookup(cache, ref, sources.unit, new Date(), CACHE_HOURS);
      if (hit) {
        console.log(describeOutcome(itemId, ref, hit.outcome, `cached ${formatAge(hit.ageMs)} ago`));
        values.push(hit.outcome.perUnit);
        continue;
      }
      const cooldown = ignoreCooldown ? { active: false } : blockCooldown(cache, ref.site, new Date(), COOLDOWN_HOURS);
      if (cooldown.active) {
        throw new BlockedError(
          `A previous run was blocked by ${ref.site} (HTTP ${cooldown.status}) at ${when(cooldown.at)}, so no requests are sent to it until ${when(cooldown.until)} (--ignore-cooldown overrides this)`,
          cooldown.status,
          ref.site,
        );
      }
      if (requested) await sleep(delayMs());
      requested = true;
      let fetched;
      try {
        fetched = await fetchRef(itemId, index, ref);
      } catch (error) {
        if (error instanceof BlockedError) saveCache((cache = markBlocked(cache, error.site ?? ref.site, error.status ?? 429, new Date())));
        throw error;
      }
      const { body, error } = fetched;
      if (error) {
        console.log(`  ${itemId}: ${label} ✗ ${error}`);
        continue;
      }
      let outcome;
      if (ref.site === "digikala") {
        const { value, error: parseError } = parseJsonText(body);
        outcome = parseError
          ? { ok: false, reason: "response was not valid JSON", tried: [] }
          : priceFromDigikala(value, ref, sources.unit);
      } else {
        outcome = priceFromPage(body, ref, sources.unit);
      }
      if (!outcome.ok) {
        console.log(`  ${itemId}: ${label} ✗ ${outcome.reason}`);
        continue;
      }
      console.log(describeOutcome(itemId, ref, outcome));
      saveCache((cache = cacheStore(cache, ref, sources.unit, outcome, new Date())));
      values.push(outcome.perUnit);
    }
    const price = median(values);
    if (price !== null) {
      collected[itemId] = price;
      if (values.length < refs.length) partial.push(`${itemId} (${values.length} of ${refs.length})`);
    } else failed.push(itemId);
  }
  return { collected, failed, partial };
}

function fail(code, message) {
  console.error(`\n✗ ${message}`);
  process.exit(code);
}

async function main() {
  // Inputs
  const manualFile = existsSync(MANUAL_PATH) ? parseManualCsv(decodeTextFile(readFileSync(MANUAL_PATH))) : { prices: {}, errors: [] };
  let sources = { unit: "rial", items: {} };
  let sourceErrors = [];
  if (!offline && existsSync(SOURCES_PATH)) {
    ({ sources, errors: sourceErrors } = parseSources(readJson(SOURCES_PATH, "data/price-sources.json")));
  }
  const inputErrors = [...manualFile.errors, ...sourceErrors];
  if (inputErrors.length > 0) {
    fail(1, `Problems in the input files (nothing was changed):\n  - ${inputErrors.join("\n  - ")}`);
  }

  const previousRaw = existsSync(FEED_PATH) ? readJson(FEED_PATH, "public/prices.json") : null;
  const previous = previousRaw ? restoreFeed({ asOf: previousRaw.asOf, prices: previousRaw.items }) : null;

  // Refuse to publish from a random branch before touching anything.
  let branch = "";
  if (publish) {
    branch = git("rev-parse", "--abbrev-ref", "HEAD");
    if (!["main", "master"].includes(branch) && !args.has("--any-branch")) {
      fail(1, `You are on branch "${branch}". Switch to main to publish, or run with --any-branch.`);
    }
  }

  // Collect
  let collected = {};
  let failed = [];
  let partial = [];
  const refCount = Object.values(sources.items).reduce((n, refs) => n + refs.length, 0);
  if (!offline && refCount > 0) {
    const cache = loadCache();
    const cached = refresh
      ? 0
      : Object.values(sources.items)
          .flat()
          .filter((ref) => cacheLookup(cache, ref, sources.unit, new Date(), CACHE_HOURS)).length;
    console.log(
      `Prices for ${refCount} product links: ${cached} from the cache (under ${CACHE_HOURS} h old), ${refCount - cached} to fetch (with pauses between requests)…`,
    );
    try {
      ({ collected, failed, partial } = await collect(sources, cache));
    } catch (error) {
      if (error instanceof BlockedError) {
        fail(
          2,
          `${error.message}. Run stopped and nothing was written. Prices already fetched are kept in the cache for the next run. Wait a few hours, or change the source/IP.`,
        );
      }
      throw error;
    }
  } else if (!offline) {
    console.log("No links in data/price-sources.json; reading only the manual CSV.");
  }

  if (failed.length > 0) {
    console.log(`\n⚠ No price was fetched for these items; they keep their previous price (check the links): ${failed.join(", ")}`);
  }
  if (partial.length > 0) {
    console.log(`\n⚠ Priced from fewer links than configured (see the ✗ lines above): ${partial.join(", ")}`);
  }

  // Plan
  const plan = planUpdate({ previous, manual: manualFile.prices, collected });
  console.log("");
  if (plan.changes.length === 0) {
    console.log("✓ No changes; prices.json stays as it is.");
    return;
  }
  console.log("Changes (old ← new):");
  for (const c of plan.changes) {
    const pct = c.pct === null ? "new" : `${c.pct > 0 ? "+" : ""}${(c.pct * 100).toFixed(1)}%`;
    const flag = plan.jumps.includes(c) ? "  ⚠ big jump" : "";
    console.log(`  ${c.id.padEnd(9)} ${fmt(c.before).padStart(10)} ← ${fmt(c.after).padStart(10)}  ${pct.padStart(7)}  [${plan.origin[c.id]}]${flag}`);
  }
  for (const w of plan.warnings) console.log(`\n⚠ ${w}`);

  if (!plan.feed) fail(1, "Could not build a valid feed.");
  if (plan.jumps.length > 0 && !force) {
    console.log(`\n⚠ ${plan.jumps.length} price(s) changed by more than ${MAX_JUMP * 100}%.`);
    if (write) fail(3, "Writing stopped. If you are sure the prices are right, run again with --force.");
  }
  if (!write) {
    console.log("\n(Preview only; nothing was written. To publish: npm run prices:publish)");
    return;
  }

  // Write (atomically: the old file or the new one, never half)
  const tmp = `${FEED_PATH}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(plan.feed, null, 2)}\n`);
  renameSync(tmp, FEED_PATH);
  console.log(`\n✓ public/prices.json written (asOf ${plan.feed.asOf}).`);
  if (!publish) return;

  try {
    git("add", "public/prices.json");
    git("commit", "-m", `chore(prices): ${plan.feed.asOf}`, "--", "public/prices.json");
    console.log("✓ committed.");
    git("push");
    console.log(`✓ pushed (${branch}). After the deploy, the app picks up the new prices.`);
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error).trim();
    fail(4, `git failed:\n${detail}\nThe file was written; fix the problem and run git push yourself.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
