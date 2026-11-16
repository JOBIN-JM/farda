import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { averageSpend, monthRows } from "./history.ts";

const spend = (day: string, amount: number) => ({ day, amount });

describe("monthly report rows", () => {
  it("lists snapshot months newest first with basket + savings", () => {
    const rows = monthRows({
      "1405-07": { basket: 10, saved: 5 },
      "1405-08": { basket: 20, saved: 0 },
      "1404-12": { basket: 1, saved: 1 },
    });
    assert.deepEqual(
      rows.map((r) => [r.key, r.basket, r.saved, r.extras, r.total]),
      [
        ["1405-08", 20, 0, 0, 20],
        ["1405-07", 10, 5, 0, 15],
        ["1404-12", 1, 1, 0, 2],
      ],
    );
  });

  it("adds daily spending to the month it falls in", () => {
    const rows = monthRows({ "1405-08": { basket: 1_000, saved: 200 } }, [
      spend("2026-10-23", 50), // 1 Aban
      spend("2026-11-14", 30), // 23 Aban
      spend("2026-11-14", 20),
    ]);
    assert.deepEqual(rows, [{ key: "1405-08", basket: 1_000, saved: 200, extras: 100, total: 1_300 }]);
  });

  it("splits months exactly at the Persian month boundary", () => {
    const rows = monthRows({}, [spend("2026-10-22", 7), spend("2026-10-23", 9)]);
    assert.deepEqual(
      rows.map((r) => [r.key, r.extras]),
      [
        ["1405-08", 9],
        ["1405-07", 7],
      ],
    );
  });

  it("shows a month with only logged spending, without inventing a basket", () => {
    const rows = monthRows({ "1405-08": { basket: 500, saved: 0 } }, [spend("2026-10-15", 40)]);
    assert.deepEqual(
      rows.map((r) => [r.key, r.basket, r.total]),
      [
        ["1405-08", 500, 500],
        ["1405-07", null, 40],
      ],
    );
  });

  it("is empty with no data and averages the monthly totals", () => {
    assert.deepEqual(monthRows({}), []);
    const rows = monthRows({ "1405-07": { basket: 10, saved: 0 }, "1405-08": { basket: 20, saved: 0 } }, [
      spend("2026-11-14", 10),
    ]);
    assert.equal(averageSpend(rows), 20);
    assert.equal(averageSpend([]), 0);
  });
});
