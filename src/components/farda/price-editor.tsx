import { useState } from "react";
import { MAX_ITEM_PRICE, type CatalogItem } from "@/lib/farda/catalog";
import { formatCompact, formatWords, parseDigits } from "@/lib/farda/format";

/**
 * Inline editor for one basket item's unit price. Prices are rarely round
 * (62,660 / 590,590), so this takes the exact toman amount in a single field
 * and spells it out underneath to make typos in big numbers easy to spot.
 */
export function PriceEditor({
  item,
  price,
  defaultPrice,
  onSave,
  onReset,
  onClose,
}: {
  item: CatalogItem;
  price: number;
  /** Price when untouched: the latest feed price, else the catalog price. */
  defaultPrice: number;
  onSave: (price: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(price));
  const amount = parseDigits(draft);
  const valid = amount > 0 && amount <= MAX_ITEM_PRICE;
  const isCustom = price !== defaultPrice;
  const inputId = `price-${item.id}`;

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-xl bg-bg p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onSave(amount);
        onClose();
      }}
    >
      <label htmlFor={inputId} className="text-sm text-muted">
        قیمت هر {item.unit}
      </label>
      <span className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <input
          id={inputId}
          autoFocus
          inputMode="numeric"
          className="min-h-11 w-full min-w-0 bg-transparent py-2 text-base text-ink tabular-nums outline-none"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
        />
        <span className="shrink-0 text-sm text-muted">تومان</span>
      </span>
      <p className="text-xs leading-5 text-muted tabular-nums">
        {valid ? `${formatWords(amount)} تومان` : "عددی بزرگ‌تر از صفر وارد کن"}
        {" · "}پیش‌فرض {formatCompact(defaultPrice)}
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
        >
          ذخیره قیمت
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold"
        >
          انصراف
        </button>
      </div>
      {isCustom ? (
        <button
          type="button"
          className="min-h-11 text-sm font-bold text-primary"
          onClick={() => {
            onReset();
            onClose();
          }}
        >
          برگشت به قیمت پیش‌فرض
        </button>
      ) : null}
    </form>
  );
}
