import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, basketTotal, categoryTotals, portionsPerUnit, type CatalogItem } from "./catalog.ts";
import { monthDaysOfKey } from "./calendar.ts";
import {
  cleanCustomItem,
  cleanCustomItems,
  cleanHiddenItems,
  cleanItemEdits,
  hideItemId,
  showItemId,
  visibleItems,
  cleanPortion,
  diffEdit,
  newCustomId,
  resolveItems,
} from "./items.ts";
import { cleanPriceMap } from "./price-feed.ts";
import { monthlyQty } from "./schedule.ts";

const eggs = CATALOG.find((item) => item.id === "eggs")!;
const net = CATALOG.find((item) => item.category === "service")!;
const honey: CatalogItem = {
  id: "custom-honey",
  name: "عسل",
  category: "staple",
  unit: "کیلوگرم",
  price: 900_000,
  defaultQty: 0,
  portion: { label: "گرم", perUnit: 1000 },
};

describe("resolving items", () => {
  it("is the catalog itself when nothing was added or edited", () => {
    assert.deepEqual(resolveItems([], {}), CATALOG);
  });

  it("applies edits to built-in items and appends custom ones", () => {
    const items = resolveItems([honey], {
      eggs: { name: "تخم‌مرغ محلی", portion: { label: "عدد", perUnit: 12 } },
      [net.id]: { portion: { label: "روز", perUnit: 30 } },
    });
    assert.equal(items.length, CATALOG.length + 1);
    const edited = items.find((item) => item.id === "eggs")!;
    assert.equal(edited.name, "تخم‌مرغ محلی");
    assert.equal(edited.unit, eggs.unit, "untouched fields stay");
    assert.deepEqual(edited.portion, { label: "عدد", perUnit: 12 });
    assert.equal(items.find((item) => item.id === net.id)?.portion?.perUnit, 30, "a portion can be added");
    assert.equal(items[items.length - 1].id, "custom-honey");
  });

  it("removes a portion when the edit says null", () => {
    const edited = resolveItems([], { eggs: { portion: null } }).find((item) => item.id === "eggs")!;
    assert.equal(edited.portion, undefined);
    assert.equal("portion" in edited, false);
  });

  it("moves an item to another category", () => {
    const items = resolveItems([], { eggs: { category: "staple" } });
    assert.equal(items.find((item) => item.id === "eggs")?.category, "staple");
  });
});

describe("validating user items", () => {
  const good = { id: "custom-a", name: "  نان  ", category: "staple", unit: "عدد", price: 20_000 };

  it("accepts a valid item, trims it and starts at zero quantity", () => {
    assert.deepEqual(cleanCustomItem(good), { ...good, name: "نان", defaultQty: 0 });
    assert.deepEqual(cleanCustomItem({ ...good, portion: { label: "گرم", perUnit: 400 } })?.portion, {
      label: "گرم",
      perUnit: 400,
    });
  });

  it("rejects bad ids, names, units, prices and categories", () => {
    assert.equal(cleanCustomItem(null), null);
    assert.equal(cleanCustomItem({ ...good, id: "eggs" }), null, "built-in id space is reserved");
    assert.equal(cleanCustomItem({ ...good, name: "   " }), null);
    assert.equal(cleanCustomItem({ ...good, name: "x".repeat(41) }), null);
    assert.equal(cleanCustomItem({ ...good, unit: "" }), null);
    assert.equal(cleanCustomItem({ ...good, price: 0 }), null);
    assert.equal(cleanCustomItem({ ...good, price: 1.5 }), null);
    assert.equal(cleanCustomItem({ ...good, price: 2e9 }), null);
    assert.equal(cleanCustomItem({ ...good, category: "snacks" }), null);
  });

  it("drops an invalid portion but keeps the item", () => {
    assert.equal(cleanCustomItem({ ...good, portion: { label: "گرم", perUnit: 0 } })?.portion, undefined);
    assert.equal(cleanPortion({ label: "", perUnit: 5 }), null);
    assert.equal(cleanPortion({ label: "گرم", perUnit: 2.5 }), null);
  });

  it("removes duplicates and junk from a stored list", () => {
    const list = cleanCustomItems([good, { ...good, name: "دوم" }, { nope: true }, { ...good, id: "custom-b" }]);
    assert.deepEqual(
      list.map((item) => item.id),
      ["custom-a", "custom-b"],
    );
    assert.deepEqual(cleanCustomItems("x"), []);
    assert.match(newCustomId(), /^custom-.+/);
  });
});

describe("edits to built-in items", () => {
  const same = { name: eggs.name, category: eggs.category, unit: eggs.unit, portion: eggs.portion };

  it("diffs only what changed", () => {
    assert.equal(diffEdit(eggs, same), null);
    assert.deepEqual(diffEdit(eggs, { ...same, name: "تخم‌مرغ محلی" }), { name: "تخم‌مرغ محلی" });
    assert.deepEqual(diffEdit(eggs, { ...same, portion: undefined }), { portion: null });
    assert.deepEqual(diffEdit(net, { name: net.name, category: net.category, unit: net.unit }), null);
  });

  it("cleans stored edits and drops anything redundant or unknown", () => {
    const edits = cleanItemEdits({
      eggs: { name: eggs.name, unit: "کارتن", category: "nope", portion: { label: "عدد", perUnit: 30 } },
      "custom-a": { name: "x" },
      milk: { portion: null },
      [net.id]: { portion: null },
    });
    assert.deepEqual(edits, { eggs: { unit: "کارتن" }, milk: { portion: null } });
  });
});

describe("totals with custom items", () => {
  it("includes custom items in the basket and in their category", () => {
    const items = resolveItems([honey], {});
    assert.equal(basketTotal({ "custom-honey": 2 }, {}, {}, items), 1_800_000);
    assert.equal(basketTotal({ "custom-honey": 2 }), 0, "unknown to the plain catalog");
    const staple = categoryTotals({ "custom-honey": 2 }, {}, {}, items).find((c) => c.id === "staple");
    assert.equal(staple?.total, 1_800_000);
  });

  it("lets a custom item repeat through its own portion", () => {
    const items = resolveItems([honey], {});
    const aban = monthDaysOfKey("1405-08");
    // 250 g every Saturday: 5 Saturdays = 1250 g = 1.25 kg
    const monthly = monthlyQty(
      {},
      { "custom-honey": { recurrence: { kind: "weekdays", days: [0] }, qty: 250 } },
      aban,
      portionsPerUnit(items),
    );
    assert.ok(Math.abs(monthly["custom-honey"] - 1.25) < 1e-9);
    assert.equal(basketTotal(monthly, {}, {}, items), 1_125_000);
  });

  it("accepts price overrides for custom ids when told about them", () => {
    const items = resolveItems([honey], {});
    assert.deepEqual(cleanPriceMap({ "custom-honey": 950_000, nope: 1 }, items), { "custom-honey": 950_000 });
    assert.deepEqual(cleanPriceMap({ "custom-honey": 950_000 }), {}, "default stays catalog-only");
  });
});

describe("hidden items", () => {
  it("keeps only known built-in ids, once each, in catalog order", () => {
    assert.deepEqual(cleanHiddenItems(["eggs", "nope", "custom-honey", "eggs", 5, null]), ["eggs"]);
    assert.deepEqual(cleanHiddenItems(undefined), []);
    assert.deepEqual(cleanHiddenItems("eggs"), []);
  });

  it("hides and shows by id; custom and unknown ids cannot be hidden", () => {
    const hidden = hideItemId(hideItemId([], "eggs"), "eggs");
    assert.deepEqual(hidden, ["eggs"]);
    assert.deepEqual(hideItemId(hidden, "custom-honey"), ["eggs"]);
    assert.deepEqual(showItemId(hidden, "eggs"), []);
  });

  it("drops hidden items from basket and category totals, and brings them back unchanged", () => {
    const items = resolveItems([honey], {});
    const qty = { eggs: 2, "custom-honey": 1 };
    const full = basketTotal(qty, {}, {}, items);
    const hidden = visibleItems(items, ["eggs"]);
    assert.equal(hidden.some((item) => item.id === "eggs"), false);
    assert.equal(basketTotal(qty, {}, {}, hidden), honey.price);
    assert.deepEqual(
      categoryTotals(qty, {}, {}, hidden).map((c) => c.id),
      ["staple"],
    );
    assert.equal(basketTotal(qty, {}, {}, visibleItems(items, [])), full);
  });
});
