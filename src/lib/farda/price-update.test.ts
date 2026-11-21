import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_JUMP,
  aggregateNote,
  bigJumps,
  blockCooldown,
  cacheLookup,
  cacheStore,
  cleanOutcome,
  emptyCache,
  formatAge,
  markBlocked,
  parseCache,
  dumpFileName,
  extractPagePrice,
  priceFromDigikala,
  priceFromPage,
  refLabel,
  siteFromUrl,
  truncateForDump,
  unitFromCurrency,
  diffPrices,
  digikalaProductId,
  median,
  mergePrices,
  parseJsonText,
  parseManualCsv,
  parseSources,
  planUpdate,
  priceFromDigikalaJson,
  toTomanPerUnit,
  todayIso,
} from "./price-update.ts";
import { parsePriceFeed } from "./price-feed.ts";

const NOW = new Date(2026, 10, 18, 12, 0, 0); // 18 Nov 2026, local time
const previous = { asOf: "2026-11-14", prices: { milk: 140_000, eggs: 550_000, filimo: 308_000 } };

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([1, 2, 3, 4]), 3); // rounded
    assert.equal(median([]), null);
    assert.equal(median([NaN]), null);
  });
});

describe("parseManualCsv", () => {
  it("reads rows, skips header, comments and blanks, accepts Persian digits and separators", () => {
    const { prices, errors } = parseManualCsv("id,price,note\n# ماهانه\n\nfilimo,۳۱۰٬۰۰۰\nnamava,190٬000\r\nfiber, 280000 ,بهمن");
    assert.deepEqual(prices, { filimo: 310_000, namava: 190_000, fiber: 280_000 });
    assert.deepEqual(errors, []);
  });

  it("finds the header row below comment lines", () => {
    const { prices, errors } = parseManualCsv("# note\n# note\nid,price,note\nmilk,140000");
    assert.deepEqual(prices, { milk: 140_000 });
    assert.deepEqual(errors, []);
  });

  it("accepts semicolons, tabs and quoted cells (Excel exports)", () => {
    const { prices, errors } = parseManualCsv('id;price\nmilk;140000\n"eggs","550000"\ntea\t775000');
    assert.deepEqual(prices, { milk: 140_000, eggs: 550_000, tea: 775_000 });
    assert.deepEqual(errors, []);
  });

  it("reports unknown ids and bad prices without stopping", () => {
    const { prices, errors } = parseManualCsv("nope,100\nmilk,abc\nmilk,-5\neggs,500000");
    assert.deepEqual(prices, { eggs: 500_000 });
    assert.equal(errors.length, 3);
  });
});

describe("parseJsonText", () => {
  it("strips a BOM and reports broken JSON instead of throwing", () => {
    assert.deepEqual(parseJsonText("\uFEFF{\"a\":1}"), { value: { a: 1 }, error: null });
    const bad = parseJsonText("{oops");
    assert.equal(bad.value, null);
    assert.ok(bad.error);
  });
});

describe("sources", () => {
  it("extracts the product id from a Digikala link", () => {
    assert.equal(digikalaProductId("https://www.digikala.com/product/dkp-1234567/شیر"), "1234567");
    assert.equal(digikalaProductId("https://example.com/x"), null);
  });

  it("validates the sources file and drops bad refs", () => {
    const { sources, errors } = parseSources({
      unit: "rial",
      items: {
        milk: [{ url: "https://www.digikala.com/product/dkp-1/", packQty: 1 }, { url: "bad", packQty: 1 }],
        eggs: [{ url: "https://www.digikala.com/product/dkp-2/", packQty: 0 }],
        nope: [],
        chicken: [],
      },
    });
    assert.deepEqual(Object.keys(sources.items), ["milk"]);
    assert.equal(sources.items.milk.length, 1);
    assert.equal(errors.length, 3);
    assert.equal(parseSources(null).errors.length, 1);
    assert.equal(parseSources({ unit: "dollar", items: {} }).errors.length, 1);
  });

  it("reads the selling price from a product response and ignores anything else", () => {
    const ok = { data: { product: { default_variant: { price: { selling_price: 1_400_000 } } } } };
    assert.equal(priceFromDigikalaJson(ok), 1_400_000);
    assert.equal(priceFromDigikalaJson({ data: { product: {} } }), null); // out of stock
    assert.equal(priceFromDigikalaJson({ data: { product: { default_variant: { price: { selling_price: 0 } } } } }), null);
    assert.equal(priceFromDigikalaJson({ data: { product: { default_variant: { price: { selling_price: "9" } } } } }), null);
    assert.equal(priceFromDigikalaJson(null), null);
  });

  it("converts to toman per purchase unit", () => {
    assert.equal(toTomanPerUnit(1_400_000, "rial", 1), 140_000);
    assert.equal(toTomanPerUnit(1_400_000, "toman", 1), 1_400_000);
    assert.equal(toTomanPerUnit(6_120_000, "rial", 1.8), 340_000); // 1.8 kg chicken
    assert.equal(toTomanPerUnit(100, "rial", 0), null);
    assert.equal(toTomanPerUnit(-1, "rial", 1), null);
  });
});

describe("mergePrices", () => {
  it("prefers manual, then sources, then the existing price, and drops unknown ids", () => {
    const { prices, origin } = mergePrices({
      previous: { milk: 1, eggs: 2, tea: 3, ghost: 9 } as never,
      collected: { milk: 10, eggs: 20 },
      manual: { milk: 100 },
    });
    assert.deepEqual(prices, { milk: 100, eggs: 20, tea: 3 });
    assert.deepEqual(origin, { milk: "manual", eggs: "source", tea: "kept" });
  });
});

describe("diff and jump guard", () => {
  it("lists only changed items with the percent change", () => {
    const changes = diffPrices({ milk: 100, eggs: 200 }, { milk: 100, eggs: 250, tea: 50 });
    assert.deepEqual(changes.map((c) => [c.id, c.before, c.after]), [["eggs", 200, 250], ["tea", null, 50]]);
    assert.equal(changes[0].pct, 0.25);
  });

  it("flags moves beyond the limit, up or down, but not new items or the limit itself", () => {
    const changes = diffPrices({ milk: 100, eggs: 100, tea: 100 }, { milk: 126, eggs: 70, tea: 125, butter: 9 });
    assert.deepEqual(bigJumps(changes).map((c) => c.id), ["milk", "eggs"]);
    assert.equal(MAX_JUMP, 0.25);
  });
});

describe("planUpdate", () => {
  it("writes nothing when nothing changed", () => {
    const plan = planUpdate({ previous, manual: {}, collected: {}, now: NOW });
    assert.equal(plan.feed, null);
    assert.equal(plan.changes.length, 0);
  });

  it("builds a feed the app accepts, dated today, keeping untouched prices", () => {
    const plan = planUpdate({ previous, manual: { filimo: 320_000 }, collected: { milk: 150_000 }, now: NOW });
    assert.equal(plan.feed?.asOf, "2026-11-18");
    assert.deepEqual(plan.feed?.items, { milk: 150_000, eggs: 550_000, filimo: 320_000 });
    assert.deepEqual(parsePriceFeed(plan.feed, NOW)?.prices, plan.feed?.items);
    assert.equal(plan.jumps.length, 0);
    assert.deepEqual(plan.warnings, []);
  });

  it("reports jumps so the caller can refuse to publish", () => {
    const plan = planUpdate({ previous, manual: {}, collected: { eggs: 900_000 }, now: NOW });
    assert.deepEqual(plan.jumps.map((j) => j.id), ["eggs"]);
  });

  it("warns when the feed is already dated today (the app would not take it)", () => {
    const plan = planUpdate({ previous: { ...previous, asOf: "2026-11-18" }, manual: {}, collected: { milk: 150_000 }, now: NOW });
    assert.equal(plan.warnings.length, 1);
  });

  it("works with no previous feed", () => {
    const plan = planUpdate({ previous: null, manual: { milk: 140_000 }, collected: {}, now: NOW });
    assert.deepEqual(plan.feed?.items, { milk: 140_000 });
    assert.equal(plan.jumps.length, 0);
  });

  it("formats the local date", () => {
    assert.equal(todayIso(new Date(2026, 0, 5)), "2026-01-05");
  });
});

/* ---------- Marketban / Torob ---------- */

const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const page = (head: string) => `<!doctype html><html><head><title>x</title>${head}</head><body>...</body></html>`;

describe("siteFromUrl and refLabel", () => {
  it("detects the site by hostname only", () => {
    assert.equal(siteFromUrl("https://www.marketban.com/product/mkb-1/x"), "marketban");
    assert.equal(siteFromUrl("https://torob.com/p/54977909-79da-4d99-ba18-45c9cdc00778/x/"), "torob");
    assert.equal(siteFromUrl("https://m.torob.com/p/1/"), "torob");
    assert.equal(siteFromUrl("https://www.digikala.com/product/dkp-1/"), "digikala");
    assert.equal(siteFromUrl("https://torob.com.evil.io/p/1/"), null);
    assert.equal(siteFromUrl("https://example.com/product/mkb-1"), null);
    assert.equal(siteFromUrl("not a url"), null);
    assert.equal(siteFromUrl("ftp://torob.com/p/1"), null);
  });

  it("makes short labels for log lines", () => {
    assert.equal(refLabel({ site: "digikala", url: "https://www.digikala.com/product/dkp-77/" }), "dkp-77");
    assert.equal(refLabel({ site: "marketban", url: "https://www.marketban.com/product/mkb-5205932/abc" }), "mkb-5205932");
    assert.equal(
      refLabel({ site: "torob", url: "https://torob.com/p/54977909-79da-4d99-ba18-45c9cdc00778/x/" }),
      "torob:54977909",
    );
  });
});

describe("parseSources with several sites", () => {
  it("accepts marketban and torob links, keeps site and per-link unit", () => {
    const { sources, errors } = parseSources({
      unit: "toman",
      items: {
        milk: [
          { url: "https://www.marketban.com/product/mkb-1/x", packQty: 0.946 },
          { url: "https://torob.com/p/54977909-79da-4d99-ba18-45c9cdc00778/x/", packQty: 1, unit: "rial" },
        ],
        eggs: [],
      },
    });
    assert.deepEqual(errors, []);
    assert.equal(sources.unit, "toman");
    assert.deepEqual(sources.items.milk.map((r) => [r.site, r.unit]), [["marketban", undefined], ["torob", "rial"]]);
    assert.equal("eggs" in sources.items, false);
  });

  it("explains unknown hosts, bad packQty and bad unit clearly", () => {
    const { sources, errors } = parseSources({
      items: {
        milk: [
          { url: "https://example.com/p/1", packQty: 1 },
          { url: "https://www.marketban.com/product/mkb-1/x", packQty: -1 },
          { url: "https://www.marketban.com/product/mkb-2/x", packQty: "1" },
          { url: "https://www.marketban.com/product/mkb-3/x", packQty: 1, unit: "dollar" },
          { url: "https://www.digikala.com/product/no-id/", packQty: 1 },
        ],
      },
    });
    assert.deepEqual(sources.items, {});
    assert.equal(errors.length, 5);
    assert.match(errors[0], /unknown site "example.com"/);
    assert.match(errors[1], /packQty/);
    assert.match(errors[2], /packQty/);
    assert.match(errors[3], /unit/);
    assert.match(errors[4], /dkp-/);
  });
});

describe("unitFromCurrency", () => {
  it("maps IRR to rial and IRT / TOMAN to toman, and never guesses", () => {
    assert.equal(unitFromCurrency("IRR"), "rial");
    assert.equal(unitFromCurrency("irt"), "toman");
    assert.equal(unitFromCurrency(" TOMAN "), "toman");
    assert.equal(unitFromCurrency("USD"), null);
    assert.equal(unitFromCurrency(undefined), null);
  });
});

describe("extractPagePrice", () => {
  it("(a) reads JSON-LD Product with an Offer, string prices and Persian digits", () => {
    const html = page(ld({ "@type": "Product", offers: { "@type": "Offer", price: "۱٬۲۳۰٬۰۰۰", priceCurrency: "IRR" } }));
    const r = extractPagePrice(html);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.reading, { raw: 1_230_000, offers: [1_230_000], currency: "IRR", method: "json-ld" });
  });

  it("(a) finds the Product inside @graph or an array, and skips other types and broken blocks", () => {
    const html = page(
      `<script type="application/ld+json">{oops</script>` +
        ld([{ "@type": "BreadcrumbList" }, { "@graph": [{ "@type": "Organization" }, { "@type": ["Thing", "Product"], offers: { price: 5000 } }] }]),
    );
    const r = extractPagePrice(html);
    assert.ok(r.ok && r.reading.raw === 5000 && r.reading.method === "json-ld");
  });

  it("(a) uses lowPrice of an AggregateOffer, but the listed offers when it has them", () => {
    const low = extractPagePrice(page(ld({ "@type": "Product", offers: { "@type": "AggregateOffer", lowPrice: 900, highPrice: 2000, priceCurrency: "IRT" } })));
    assert.ok(low.ok && low.reading.raw === 900 && low.reading.offers.length === 1 && low.reading.currency === "IRT");
    const listed = extractPagePrice(
      page(ld({ "@type": "Product", offers: { "@type": "AggregateOffer", lowPrice: 1, offers: [{ price: 100 }, { price: 300 }, { price: 200 }] } })),
    );
    assert.ok(listed.ok);
    if (listed.ok) assert.deepEqual(listed.reading.offers, [100, 300, 200]);
  });

  it("(b) falls back to __NEXT_DATA__ when there is no usable JSON-LD", () => {
    const data = { props: { pageProps: { product: { title: "x", price: 123_000, currency: "IRT" } } } };
    const html = page(`${ld({ "@type": "Organization" })}<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`);
    const r = extractPagePrice(html);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.reading, { raw: 123_000, offers: [123_000], currency: "IRT", method: "next-data" });
  });

  it("(b) understands a nested price object and ignores related products", () => {
    const data = {
      props: {
        relatedProducts: [{ price: 1 }],
        pageProps: { productDetail: { price: { selling_price: 777_000 } } },
      },
    };
    const r = extractPagePrice(page(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`));
    assert.ok(r.ok && r.reading.raw === 777_000 && r.reading.method === "next-data");
    const onlyRelated = { props: { similarProducts: [{ price: 5 }], footer: { price: 9 } } };
    assert.equal(extractPagePrice(page(`<script id="__NEXT_DATA__">${JSON.stringify(onlyRelated)}</script>`)).ok, false);
  });

  it("(c) falls back to meta tags, in any attribute order", () => {
    const html = page(
      `<meta content="450000" property="product:price:amount"><meta property='product:price:currency' content='IRT'>`,
    );
    const r = extractPagePrice(html);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.reading, { raw: 450_000, offers: [450_000], currency: "IRT", method: "meta" });
    const og = extractPagePrice(page(`<meta property="og:price:amount" content="1,000"><meta name="x" content="y">`));
    assert.ok(og.ok && og.reading.raw === 1000 && og.reading.currency === null);
  });

  it("takes the first method that works, in order a, b, c", () => {
    const html = page(
      `<meta property="product:price:amount" content="1">` +
        `<script id="__NEXT_DATA__">${JSON.stringify({ product: { price: 2 } })}</script>` +
        ld({ "@type": "Product", offers: { price: 3 } }),
    );
    const r = extractPagePrice(html);
    assert.ok(r.ok && r.reading.raw === 3);
  });

  it("skips zero, negative and non-numeric prices", () => {
    const html = page(ld({ "@type": "Product", offers: [{ price: 0 }, { price: "call us" }, { price: -5 }] }));
    assert.equal(extractPagePrice(html).ok, false);
  });

  it("reports every method it tried when nothing works", () => {
    const r = extractPagePrice("<html><body><div id=root></div><script src=app.js></script></body></html>");
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.tried.length, 3);
      assert.match(r.tried[0], /JSON-LD/);
      assert.match(r.tried[1], /__NEXT_DATA__/);
      assert.match(r.tried[2], /og:price/);
    }
  });
});

describe("priceFromPage", () => {
  const mk = (currency?: string, price: unknown = 1_000_000) =>
    page(ld({ "@type": "Product", offers: { price, ...(currency ? { priceCurrency: currency } : {}) } }));

  it("uses the page currency: IRR is rial, IRT is toman", () => {
    const rial = priceFromPage(mk("IRR"), { site: "marketban", packQty: 1 }, "toman");
    assert.ok(rial.ok);
    if (rial.ok) {
      assert.deepEqual([rial.raw, rial.unit, rial.unitSource, rial.toman, rial.perUnit], [1_000_000, "rial", "page-currency", 100_000, 100_000]);
    }
    const toman = priceFromPage(mk("IRT"), { site: "marketban", packQty: 0.5 }, "rial");
    assert.ok(toman.ok && toman.unit === "toman" && toman.perUnit === 2_000_000);
  });

  it("without a currency: the link's unit beats the file-wide unit; the unit source is reported", () => {
    const byRef = priceFromPage(mk(), { site: "marketban", packQty: 1, unit: "rial" }, "toman");
    assert.ok(byRef.ok && byRef.unit === "rial" && byRef.unitSource === "ref-unit" && byRef.perUnit === 100_000);
    const byFile = priceFromPage(mk(), { site: "marketban", packQty: 1 }, "toman");
    assert.ok(byFile.ok && byFile.unit === "toman" && byFile.unitSource === "global-unit" && byFile.perUnit === 1_000_000);
  });

  it("an unknown currency code falls back to the configured unit with a warning", () => {
    const r = priceFromPage(mk("USD"), { site: "marketban", packQty: 1 }, "toman");
    assert.ok(r.ok && r.unit === "toman" && r.unitSource === "global-unit");
    if (r.ok) assert.match(r.warnings[0], /USD/);
  });

  it("divides by packQty (0.946 L milk)", () => {
    const r = priceFromPage(mk("IRT", 946_000), { site: "marketban", packQty: 0.946 }, "toman");
    assert.ok(r.ok && r.perUnit === 1_000_000);
  });

  it("Torob: median of the offers, marked aggregated", () => {
    const html = page(ld({ "@type": "Product", offers: [{ price: 100 }, { price: 900 }, { price: 120 }, { price: 110 }, { price: 130 }] }));
    const r = priceFromPage(html, { site: "torob", packQty: 1 }, "toman");
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.raw, 120); // the 900 outlier does not move the median
      assert.equal(r.kind, "median");
      assert.equal(r.aggregated, true);
      assert.equal(aggregateNote(r), "aggregate: median of 5 offers");
    }
  });

  it("Torob: a single number is taken as is and still marked aggregated", () => {
    const r = priceFromPage(mk("IRT", 5000), { site: "torob", packQty: 1 }, "toman");
    assert.ok(r.ok && r.raw === 5000 && r.aggregated && r.kind === "lowest");
    assert.equal(aggregateNote(r), "aggregate: cheapest seller");
  });

  it("Marketban: one price is not aggregated; several offers take the cheapest and say so", () => {
    const one = priceFromPage(mk("IRT", 5000), { site: "marketban", packQty: 1 }, "toman");
    assert.ok(one.ok && !one.aggregated);
    assert.equal(aggregateNote(one), null);
    const many = priceFromPage(page(ld({ "@type": "Product", offers: [{ price: 300 }, { price: 200 }] })), { site: "marketban", packQty: 1 }, "toman");
    assert.ok(many.ok && many.raw === 200 && many.aggregated);
    assert.equal(aggregateNote(many), "aggregate: cheapest of 2 offers");
  });

  it("a page without a price explains what was tried and mentions JavaScript", () => {
    const r = priceFromPage("<html><body><div id=root></div></body></html>", { site: "torob", packQty: 1 }, "toman");
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.tried.length, 3);
      assert.match(r.reason, /JSON-LD/);
      assert.match(r.reason, /JavaScript/);
      assert.match(r.reason, /--debug-dump/);
    }
  });
});

describe("priceFromDigikala", () => {
  const json = { data: { product: { default_variant: { price: { selling_price: 1_400_000 } } } } };
  it("keeps the old behaviour: no currency in the API, so the link's or the file's unit", () => {
    const a = priceFromDigikala(json, { packQty: 1, unit: "rial" }, "toman");
    assert.ok(a.ok && a.perUnit === 140_000 && a.unitSource === "ref-unit" && a.method === "digikala-api");
    const b = priceFromDigikala(json, { packQty: 1 }, "rial");
    assert.ok(b.ok && b.perUnit === 140_000 && b.unitSource === "global-unit");
    assert.equal(priceFromDigikala({ data: { product: {} } }, { packQty: 1 }, "rial").ok, false);
  });
});

describe("debug dumps", () => {
  it("cuts at the byte limit without leaving half a character", () => {
    assert.deepEqual(truncateForDump("abc", 10), { text: "abc", truncated: false });
    const fa = "قیمت".repeat(100); // 2 bytes per letter
    const out = truncateForDump(fa, 11);
    assert.equal(out.truncated, true);
    assert.ok(new TextEncoder().encode(out.text).length <= 11);
    assert.ok(!out.text.includes("\uFFFD"));
    assert.equal(truncateForDump("x".repeat(300 * 1024)).text.length, 200 * 1024);
  });

  it("names dump files by item, link number and host", () => {
    assert.equal(dumpFileName("rice-ir", 1, "https://www.marketban.com/product/mkb-1/x", "html"), "rice-ir-2-marketban.com.html");
    assert.equal(dumpFileName("milk", 0, "https://api.digikala.com/v1/", "json"), "milk-1-api.digikala.com.json");
  });
});

/* ---------- cache ---------- */

describe("price cache", () => {
  const ref = { url: "https://www.marketban.com/product/mkb-1/x", packQty: 0.946 };
  const T0 = new Date("2026-11-20T08:00:00Z");
  const hours = (n: number) => new Date(T0.getTime() + n * 3600 * 1000);
  const outcome = (() => {
    const r = priceFromPage(
      page(ld({ "@type": "Product", offers: { price: 1_275_000, priceCurrency: "IRR" } })),
      { site: "marketban", packQty: 0.946 },
      "toman",
    );
    assert.ok(r.ok);
    return r as Extract<typeof r, { ok: true }>;
  })();

  it("returns a fresh reading and misses once it is too old", () => {
    const cache = cacheStore(emptyCache(), ref, "toman", outcome, T0);
    const hit = cacheLookup(cache, ref, "toman", hours(3), 12);
    assert.ok(hit);
    assert.equal(hit.outcome.perUnit, 134_778);
    assert.equal(hit.ageMs, 3 * 3600 * 1000);
    assert.equal(cacheLookup(cache, ref, "toman", hours(12), 12)?.outcome.perUnit, 134_778); // exactly at the limit
    assert.equal(cacheLookup(cache, ref, "toman", hours(12.1), 12), null);
    assert.equal(cacheLookup(cache, ref, "toman", hours(-1), 12), null); // clock went backwards
    assert.equal(cacheLookup(cache, { ...ref, url: "https://www.marketban.com/product/mkb-2/x" }, "toman", hours(1), 12), null);
  });

  it("misses when the pack size or a unit setting changed since the reading", () => {
    const cache = cacheStore(emptyCache(), ref, "toman", outcome, T0);
    assert.equal(cacheLookup(cache, { ...ref, packQty: 1 }, "toman", hours(1)), null);
    assert.equal(cacheLookup(cache, { ...ref, unit: "rial" }, "toman", hours(1)), null);
    assert.equal(cacheLookup(cache, ref, "rial", hours(1)), null);
  });

  it("does not change the cache it was given, and drops entries older than two weeks", () => {
    const old = cacheStore(emptyCache(), { url: "https://torob.com/p/old", packQty: 1 }, "toman", outcome, T0);
    const later = new Date(T0.getTime() + 15 * 24 * 3600 * 1000);
    const next = cacheStore(old, ref, "toman", outcome, later);
    assert.deepEqual(Object.keys(old.entries), ["https://torob.com/p/old"]);
    assert.deepEqual(Object.keys(next.entries), [ref.url]);
  });

  it("round-trips through JSON and survives garbage on disk", () => {
    const cache = cacheStore(emptyCache(), ref, "toman", outcome, T0);
    assert.deepEqual(parseCache(JSON.parse(JSON.stringify(cache))), cache);
    assert.deepEqual(parseCache(null), emptyCache());
    assert.deepEqual(parseCache({ version: 2, entries: {} }), emptyCache());
    const broken = JSON.parse(JSON.stringify(cache));
    broken.entries["https://x.com/bad"] = { fetchedAt: "yesterday", packQty: 1, refUnit: null, globalUnit: "toman", outcome: {} };
    broken.entries[ref.url].outcome.perUnit = -5;
    assert.deepEqual(parseCache(broken).entries, {});
  });

  it("cleanOutcome rejects readings with a missing or wrong-typed field", () => {
    const good = JSON.parse(JSON.stringify(outcome));
    assert.ok(cleanOutcome(good));
    assert.equal(cleanOutcome({ ...good, ok: false }), null);
    assert.equal(cleanOutcome({ ...good, unit: "dollar" }), null);
    assert.equal(cleanOutcome({ ...good, method: "magic" }), null);
    assert.equal(cleanOutcome({ ...good, offerCount: 0 }), null);
    assert.equal(cleanOutcome({ ...good, warnings: [1] }), null);
    assert.equal(cleanOutcome(null), null);
  });
});

describe("block cooldown", () => {
  const T0 = new Date("2026-11-20T08:00:00Z");
  const hours = (n: number) => new Date(T0.getTime() + n * 3600 * 1000);

  it("is inactive without a block, active for the cooldown, then inactive again", () => {
    assert.deepEqual(blockCooldown(emptyCache(), T0), { active: false });
    const blocked = markBlocked(emptyCache(), 429, T0);
    const during = blockCooldown(blocked, hours(5.9), 6);
    assert.ok(during.active);
    if (during.active) {
      assert.equal(during.status, 429);
      assert.equal(during.until, hours(6).toISOString());
    }
    assert.deepEqual(blockCooldown(blocked, hours(6), 6), { active: false });
  });

  it("a later successful reading clears the block marker", () => {
    const ref = { url: "https://torob.com/p/x", packQty: 1 };
    const ok = priceFromPage(page(ld({ "@type": "Product", offers: { price: 5, priceCurrency: "IRT" } })), { site: "torob", packQty: 1 }, "toman");
    assert.ok(ok.ok);
    const cache = cacheStore(markBlocked(emptyCache(), 403, T0), ref, "toman", ok as Extract<typeof ok, { ok: true }>, hours(7));
    assert.equal(cache.blocked, null);
  });

  it("survives a round-trip through parseCache", () => {
    const blocked = markBlocked(emptyCache(), 429, T0);
    assert.deepEqual(parseCache(JSON.parse(JSON.stringify(blocked))).blocked, { at: T0.toISOString(), status: 429 });
  });
});

describe("formatAge", () => {
  it("is short and readable", () => {
    assert.equal(formatAge(10_000), "<1 min");
    assert.equal(formatAge(25 * 60_000), "25 min");
    assert.equal(formatAge(3 * 3600_000), "3 h");
    assert.equal(formatAge(3 * 3600_000 + 12 * 60_000), "3 h 12 min");
    assert.equal(formatAge(5 * 24 * 3600_000), "5 days");
    assert.equal(formatAge(-5), "<1 min");
  });
});
