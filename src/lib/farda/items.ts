import { CATALOG, CATEGORIES, MAX_ITEM_PRICE, type CatalogItem, type CategoryId, type Portion } from "./catalog.ts";

/** Ids of items the user added themselves; built-in catalog ids never start with this. */
export const CUSTOM_ID_PREFIX = "custom-";
export const MAX_CUSTOM_ITEMS = 100;
export const MAX_NAME_LENGTH = 40;
export const MAX_UNIT_LENGTH = 20;
export const MAX_PORTION_LABEL_LENGTH = 12;
export const MAX_PORTIONS_PER_UNIT = 100_000;

/** Changes to a built-in item. `portion: null` means the consumption unit was removed. */
export type ItemEdit = {
  name?: string;
  unit?: string;
  category?: CategoryId;
  portion?: Portion | null;
};

/** What the item form collects. Built-in items do not use `price` (it is edited as a price override). */
export type ItemDraft = {
  name: string;
  category: CategoryId;
  unit: string;
  price: number;
  portion?: Portion;
};

const isCategory = (value: unknown): value is CategoryId =>
  typeof value === "string" && CATEGORIES.some((category) => category.id === value);

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

export function cleanPortion(raw: unknown): Portion | null {
  if (!raw || typeof raw !== "object") return null;
  const { label, perUnit } = raw as Record<string, unknown>;
  const cleanLabel = cleanText(label, MAX_PORTION_LABEL_LENGTH);
  if (!cleanLabel) return null;
  if (typeof perUnit !== "number" || !Number.isInteger(perUnit) || perUnit < 1 || perUnit > MAX_PORTIONS_PER_UNIT) {
    return null;
  }
  return { label: cleanLabel, perUnit };
}

export function newCustomId(): string {
  return `${CUSTOM_ID_PREFIX}${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

/** Validate a user-made item. Quantity starts at 0 here; the store sets the first quantity. */
export function cleanCustomItem(raw: unknown): CatalogItem | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || !value.id.startsWith(CUSTOM_ID_PREFIX) || value.id.length > 64) return null;
  const name = cleanText(value.name, MAX_NAME_LENGTH);
  const unit = cleanText(value.unit, MAX_UNIT_LENGTH);
  const price = value.price;
  if (!name || !unit || !isCategory(value.category)) return null;
  if (typeof price !== "number" || !Number.isInteger(price) || price < 1 || price > MAX_ITEM_PRICE) return null;
  const item: CatalogItem = { id: value.id, name, category: value.category, unit, price, defaultQty: 0 };
  const portion = cleanPortion(value.portion);
  if (portion) item.portion = portion;
  return item;
}

export function cleanCustomItems(raw: unknown): CatalogItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: CatalogItem[] = [];
  for (const entry of raw) {
    const item = cleanCustomItem(entry);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items.slice(0, MAX_CUSTOM_ITEMS);
}

const samePortion = (a: Portion | undefined, b: Portion | undefined) =>
  a === b || (a !== undefined && b !== undefined && a.label === b.label && a.perUnit === b.perUnit);

/** The smallest edit that turns `base` into `draft`, or null when nothing differs. */
export function diffEdit(
  base: CatalogItem,
  draft: Pick<ItemDraft, "name" | "category" | "unit" | "portion">,
): ItemEdit | null {
  const edit: ItemEdit = {};
  const name = draft.name.trim();
  const unit = draft.unit.trim();
  if (name !== base.name) edit.name = name;
  if (unit !== base.unit) edit.unit = unit;
  if (draft.category !== base.category) edit.category = draft.category;
  if (!samePortion(draft.portion, base.portion)) edit.portion = draft.portion ?? null;
  return Object.keys(edit).length > 0 ? edit : null;
}

/** Validate stored edits: known built-in ids only, valid fields only, nothing that equals the original. */
export function cleanItemEdits(raw: unknown): Record<string, ItemEdit> {
  const clean: Record<string, ItemEdit> = {};
  if (!raw || typeof raw !== "object") return clean;
  for (const base of CATALOG) {
    const value = (raw as Record<string, unknown>)[base.id];
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const edit: ItemEdit = {};
    const name = cleanText(entry.name, MAX_NAME_LENGTH);
    const unit = cleanText(entry.unit, MAX_UNIT_LENGTH);
    if (name && name !== base.name) edit.name = name;
    if (unit && unit !== base.unit) edit.unit = unit;
    if (isCategory(entry.category) && entry.category !== base.category) edit.category = entry.category;
    if (entry.portion === null) {
      if (base.portion) edit.portion = null;
    } else {
      const portion = cleanPortion(entry.portion);
      if (portion && !samePortion(portion, base.portion)) edit.portion = portion;
    }
    if (Object.keys(edit).length > 0) clean[base.id] = edit;
  }
  return clean;
}

/** The items the app works with: the catalog with the user's edits, then the items they added. */
export function resolveItems(customItems: CatalogItem[], edits: Record<string, ItemEdit>): CatalogItem[] {
  const builtIn = CATALOG.map((base) => {
    const edit = edits[base.id];
    if (!edit) return base;
    const { portion: _portion, ...rest } = base;
    const portion = edit.portion === null ? undefined : (edit.portion ?? base.portion);
    return {
      ...rest,
      name: edit.name ?? base.name,
      unit: edit.unit ?? base.unit,
      category: edit.category ?? base.category,
      ...(portion ? { portion } : {}),
    };
  });
  return [...builtIn, ...customItems];
}

/** Valid stored ids of hidden built-in items: known catalog ids only, no duplicates, catalog order. */
export function cleanHiddenItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const wanted = new Set(raw.filter((id): id is string => typeof id === "string"));
  return CATALOG.filter((item) => wanted.has(item.id)).map((item) => item.id);
}

/** Hide a built-in item. Custom and unknown ids are ignored (custom items are removed, not hidden). */
export function hideItemId(hidden: string[], id: string): string[] {
  return cleanHiddenItems([...hidden, id]);
}

export function showItemId(hidden: string[], id: string): string[] {
  return hidden.filter((entry) => entry !== id);
}

/** The items that count in the basket, report, home and calendar: everything except hidden items. */
export function visibleItems(items: CatalogItem[], hidden: string[]): CatalogItem[] {
  if (hidden.length === 0) return items;
  const gone = new Set(hidden);
  return items.filter((item) => !gone.has(item.id));
}
