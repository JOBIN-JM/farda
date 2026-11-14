export const PRICE_AS_OF = "۲۳ آبان ۱۴۰۵";

export type CategoryId = "dairy" | "protein" | "staple" | "service";

export type CatalogItem = {
  id: string;
  name: string;
  category: CategoryId;
  unit: string;
  price: number;
  defaultQty: number;
};

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "dairy", label: "لبنیات" },
  { id: "protein", label: "پروتئین" },
  { id: "staple", label: "خواربار" },
  { id: "service", label: "خدمات و اشتراک" },
];

/**
 * Reference prices for Aban 1405 (early November 2026).
 * Food: Statistical Center / market watches published that month.
 * Internet: MCI and Irancell tariffs after the 1 Aban increase.
 * Subscriptions: published monthly plans the same month.
 */
export const CATALOG: CatalogItem[] = [
  { id: "milk", name: "شیر پاستوریزه", category: "dairy", unit: "لیتر", price: 140_000, defaultQty: 8 },
  { id: "yogurt", name: "ماست پاستوریزه", category: "dairy", unit: "کیلوگرم", price: 185_000, defaultQty: 3 },
  { id: "cheese", name: "پنیر سفید ۴۰۰ گرمی", category: "dairy", unit: "بسته", price: 195_000, defaultQty: 2 },
  { id: "butter", name: "کره ۵۰ گرمی", category: "dairy", unit: "بسته", price: 60_000, defaultQty: 4 },
  { id: "eggs", name: "تخم‌مرغ ۳۰ عددی", category: "protein", unit: "شانه", price: 550_000, defaultQty: 2 },
  { id: "chicken", name: "مرغ", category: "protein", unit: "کیلوگرم", price: 340_000, defaultQty: 4 },
  { id: "lamb", name: "گوشت گوسفندی", category: "protein", unit: "کیلوگرم", price: 1_825_000, defaultQty: 0 },
  { id: "beef", name: "گوشت گوساله", category: "protein", unit: "کیلوگرم", price: 1_864_000, defaultQty: 0 },
  { id: "rice-ir", name: "برنج ایرانی درجه یک", category: "staple", unit: "کیلوگرم", price: 545_000, defaultQty: 3 },
  { id: "rice-for", name: "برنج خارجی", category: "staple", unit: "کیلوگرم", price: 290_000, defaultQty: 0 },
  { id: "oil", name: "روغن مایع ۹۰۰ میلی‌لیتری", category: "staple", unit: "بطری", price: 404_000, defaultQty: 2 },
  { id: "tea", name: "چای ایرانی ۴۵۰ گرمی", category: "staple", unit: "بسته", price: 775_000, defaultQty: 1 },
  { id: "net-5", name: "اینترنت همراه ۵ گیگ", category: "service", unit: "۳۰ روز", price: 62_660, defaultQty: 0 },
  { id: "net-50", name: "اینترنت همراه ۵۰ گیگ", category: "service", unit: "۳۰ روز", price: 590_590, defaultQty: 1 },
  { id: "fiber", name: "فیبر نوری ۵۵ گیگ", category: "service", unit: "ماه", price: 277_200, defaultQty: 0 },
  { id: "tdlte", name: "اینترنت ثابت ۳۰ گیگ", category: "service", unit: "ماه", price: 172_460, defaultQty: 0 },
  { id: "filimo", name: "اشتراک فیلیمو", category: "service", unit: "ماه، با تبلیغ", price: 308_000, defaultQty: 0 },
  { id: "namava", name: "اشتراک نماوا", category: "service", unit: "ماه", price: 190_000, defaultQty: 0 },
  { id: "filmnet", name: "اشتراک فیلم‌نت", category: "service", unit: "ماه", price: 195_000, defaultQty: 0 },
];

export const INFLATION_PRESETS = [
  { id: "cbi", label: "رسمی سالانه", rate: 71.4, hint: "بانک مرکزی، مهر ۱۴۰۵" },
  { id: "yoy", label: "نقطه‌به‌نقطه", rate: 83.5, hint: "شاخص شهری" },
  { id: "goods", label: "کالای بادوام", rate: 100, hint: "تورم کالا از ۱۰۰٪ گذشت" },
  { id: "hope", label: "خوش‌بینانه", rate: 40, hint: "اگر آهنگ رشد کم شود" },
] as const;

export const GOAL_PRESETS = [
  { name: "گوشی", price: 45_000_000, annualInflation: 100 },
  { name: "لپ‌تاپ", price: 85_000_000, annualInflation: 100 },
  { name: "موتور", price: 220_000_000, annualInflation: 100 },
  { name: "یخچال", price: 60_000_000, annualInflation: 71.4 },
  { name: "سفر", price: 30_000_000, annualInflation: 71.4 },
] as const;

export function basketTotal(qty: Record<string, number>): number {
  return CATALOG.reduce((sum, item) => sum + item.price * (qty[item.id] ?? 0), 0);
}

export function categoryTotals(qty: Record<string, number>) {
  return CATEGORIES.map((category) => ({
    ...category,
    total: CATALOG.filter((item) => item.category === category.id).reduce(
      (sum, item) => sum + item.price * (qty[item.id] ?? 0),
      0,
    ),
  })).filter((category) => category.total > 0);
}
