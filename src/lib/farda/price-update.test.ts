import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_JUMP,
  bigJumps,
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
