# Farda — فردا

Persian-first personal finance planner for high-inflation environments.

Farda helps households track a monthly consumption basket, set purchase goals with inflation-aware savings, and review spending over time — with RTL UI and Jalali calendar support.

**Repository:** [github.com/JOBIN-JM/farda](https://github.com/JOBIN-JM/farda)

---

## Stack

| Layer | Choice |
|--------|--------|
| UI | React 19, Tailwind CSS v4 |
| Routing / app | TanStack Start & Router |
| State | Zustand + `localStorage` persistence |
| Build | Vite |
| Language | TypeScript |
| Locale | `fa` / RTL, Vazirmatn |

No backend is required for the core app. Optional price updates are delivered via a static JSON feed.

---

## Run locally

```bash
npm install
node ./node_modules/vite/bin/vite.js dev --host 0.0.0.0 --port 8080
```

Open [http://localhost:8080](http://localhost:8080).

> **Note (Windows):** `npm run dev` may fail with `spawn vite ENOENT` because the env wrapper spawns `vite` without a resolved binary path. The command above is the reliable entry point.

```bash
npm run build    # production build
npm test         # unit tests (including Farda domain tests)
```

---

## Product features

- **Basket** — common goods & services with editable unit prices and reset-to-default
- **Price feed** — `public/prices.json`; resolution order: user override → feed → catalog
- **Budget** — split input (millions + thousands of toman) with spoken-style amount readout
- **Goals** — purchase targets with inflation and optional deposit return
- **Report** — category breakdown, inflation scenarios, month-by-month spend table
- **Recurring consumption** — per-item schedules (weekdays, every *N* days, monthly) with portion units (e.g. eggs → trays)
- **Theming** — teal primary brand color; red reserved for destructive actions only

---

## Source map

```
src/components/farda/     UI shells and feature views
src/lib/farda/
  catalog.ts              Item catalog & base prices
  store.ts                Persisted app state
  money.ts                Inflation & savings math
  format.ts               Numbers, words, Jalali labels
  history.ts              Monthly spend history helpers
  price-feed.ts           Feed validation
  use-price-feed.ts       Client fetch / refresh
  calendar.ts             Jalali day keys & month grids
  schedule.ts             Recurrence rules & monthly qty
public/prices.json        Static price feed (versioned)
src/styles.css            Design tokens
```

---

## Price feed format

```json
{
  "version": 1,
  "asOf": "2026-11-14",
  "items": {
    "milk": 140000,
    "eggs": 550000
  }
}
```

- `asOf` must be an ISO date (`YYYY-MM-DD`). Newer feeds replace older ones.
- Unknown ids, non-positive prices, and invalid payloads are ignored.
- Manual update: edit `public/prices.json` and advance `asOf`.

---

## Domain rules (short)

1. **Price priority:** user edit → feed → `catalog.ts`.
2. **Reset price** restores the feed default when a feed is loaded, otherwise the catalog price.
3. **Service items** (internet, subscriptions) have no `portion` and cannot use recurrence.
4. **Scheduled items** convert consumption portions to purchase units via `portion.perUnit`.
5. **App reset** clears user plan data but keeps the last applied price feed.

---

## Git workflow tips

Full-tree patches are authored against a clean `main`. Before applying one:

```bash
git restore .
git clean -fd
git checkout main
git checkout -b feature/your-change
git apply path/to/changes.patch
```

Incremental step patches must be applied only on branches that already contain prior steps.

---

## License / status

Personal / experimental project. Not financial advice. Prices in the default catalog and feed are reference snapshots and will drift without updates.
