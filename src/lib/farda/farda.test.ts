import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATALOG, basketTotal, categoryTotals, defaultPriceOf, priceOf } from "./catalog.ts";
import { formatFeedDate, formatWords, monthLabelFromKey, persianMonthKey } from "./format.ts";
import { isNewerFeed, parsePriceFeed, restoreFeed } from "./price-feed.ts";
import { averageSpend, monthRows } from "./history.ts";

const milk = CATALOG.find((item) => item.id === "milk")!;

describe("price overrides", () => {
  it("uses the catalog price unless the user overrode it", () => {
    assert.equal(priceOf(milk), milk.price);
    assert.equal(priceOf(milk, { milk: 150_000 }), 150_000);
    assert.equal(priceOf(milk, { milk: 0 }), milk.price);
  });

  it("feeds overrides into basket and category totals", () => {
    const qty = { milk: 2 };
    assert.equal(basketTotal(qty), milk.price * 2);
    assert.equal(basketTotal(qty, { milk: 100_000 }), 200_000);
    assert.deepEqual(
      categoryTotals(qty, { milk: 100_000 }).map((c) => [c.id, c.total]),
      [["dairy", 200_000]],
    );
  });
});

describe("formatWords", () => {
  it("spells amounts the way people say them", () => {
    assert.equal(formatWords(0), "۰");
    assert.equal(formatWords(1_500_000), "۱ میلیون و ۵۰۰ هزار");
    assert.equal(formatWords(62_660), "۶۲ هزار و ۶۶۰");
    assert.equal(formatWords(2_000_000_000), "۲ میلیارد");
  });
});

describe("monthly history", () => {
  it("lists newest month first with totals", () => {
    const rows = monthRows({
      "1405-07": { basket: 10, saved: 5 },
      "1405-08": { basket: 20, saved: 0 },
      "1404-12": { basket: 1, saved: 1 },
    });
    assert.deepEqual(
      rows.map((r) => [r.key, r.total]),
      [
        ["1405-08", 20],
        ["1405-07", 15],
        ["1404-12", 2],
      ],
    );
    assert.equal(averageSpend(rows), Math.round(37 / 3));
    assert.equal(averageSpend([]), 0);
  });

  it("labels month keys in Persian and matches the key format used for the current month", () => {
    assert.equal(monthLabelFromKey("1405-08"), "آبان ۱۴۰۵");
    assert.equal(monthLabelFromKey("garbage"), "garbage");
    assert.match(persianMonthKey(new Date("2026-11-14T12:00:00Z")), /^\d{4}-\d{2}$/);
    assert.equal(persianMonthKey(new Date("2026-11-14T12:00:00Z")), "1405-08");
  });
});

describe("price feed", () => {
  const now = new Date("2026-11-15T10:00:00Z");
  const good = { version: 1, asOf: "2026-11-14", items: { milk: 150_000, nope: 5, eggs: -3, tea: "x" } };

  it("keeps only known items with valid positive prices", () => {
    assert.deepEqual(parsePriceFeed(good, now), { asOf: "2026-11-14", prices: { milk: 150_000 } });
  });

  it("rejects malformed, wrong-version, empty and far-future feeds", () => {
    assert.equal(parsePriceFeed(null, now), null);
    assert.equal(parsePriceFeed({ ...good, version: 2 }, now), null);
    assert.equal(parsePriceFeed({ ...good, asOf: "14 Nov" }, now), null);
    assert.equal(parsePriceFeed({ ...good, asOf: "2026-02-31" }, now), null);
    assert.equal(parsePriceFeed({ ...good, asOf: "2099-01-01" }, now), null);
    assert.equal(parsePriceFeed({ ...good, items: { nope: 1 } }, now), null);
  });

  it("only treats strictly newer dates as updates", () => {
    const current = { asOf: "2026-11-14", prices: { milk: 1 } };
    assert.equal(isNewerFeed({ asOf: "2026-11-14", prices: {} }, current), false);
    assert.equal(isNewerFeed({ asOf: "2026-11-13", prices: {} }, current), false);
    assert.equal(isNewerFeed({ asOf: "2026-11-15", prices: {} }, current), true);
    assert.equal(isNewerFeed({ asOf: "2000-01-01", prices: {} }, null), true);
  });

  it("restores a saved feed and drops junk", () => {
    assert.deepEqual(restoreFeed({ asOf: "2026-11-14", prices: { milk: 1, x: 2 } }), {
      asOf: "2026-11-14",
      prices: { milk: 1 },
    });
    assert.equal(restoreFeed({ asOf: "bad", prices: { milk: 1 } }), null);
    assert.equal(restoreFeed(undefined), null);
  });

  it("resolves price as override > feed > catalog", () => {
    assert.equal(priceOf(milk), milk.price);
    assert.equal(priceOf(milk, {}, { milk: 150_000 }), 150_000);
    assert.equal(priceOf(milk, { milk: 99_000 }, { milk: 150_000 }), 99_000);
    assert.equal(defaultPriceOf(milk, { milk: 150_000 }), 150_000);
    assert.equal(basketTotal({ milk: 2 }, {}, { milk: 150_000 }), 300_000);
  });

  it("formats the feed date in the Persian calendar", () => {
    assert.equal(formatFeedDate("2026-11-14"), "۲۳ آبان ۱۴۰۵");
    assert.equal(formatFeedDate("garbage"), "garbage");
  });

  it("ships a public/prices.json that matches the catalog and parses", () => {
    const raw = JSON.parse(readFileSync(new URL("../../../public/prices.json", import.meta.url), "utf8"));
    const feed = parsePriceFeed(raw, now);
    assert.ok(feed);
    assert.equal(Object.keys(feed.prices).length, CATALOG.length);
    for (const item of CATALOG) assert.equal(feed.prices[item.id], item.price);
  });
});
