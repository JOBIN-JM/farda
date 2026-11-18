import { useId, useState } from "react";
import { EyeOff } from "lucide-react";
import { CATEGORIES, MAX_ITEM_PRICE, type CatalogItem, type CategoryId } from "@/lib/farda/catalog";
import { formatNumber, formatWords, parseDigits } from "@/lib/farda/format";
import {
  MAX_NAME_LENGTH,
  MAX_PORTION_LABEL_LENGTH,
  MAX_UNIT_LENGTH,
  cleanCustomItem,
  type ItemDraft,
} from "@/lib/farda/items";

export type ItemFormMode = "new" | "custom" | "builtin";

const fieldClass =
  "flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary";
const inputClass = "min-h-11 w-full min-w-0 bg-transparent py-2 text-base text-ink outline-none";
const labelClass = "text-sm text-muted";

/**
 * Add a basket item, or edit one. A built-in item cannot change its price here
 * (that stays a price override, edited from the price button).
 */
export function ItemForm({
  mode,
  item,
  isEdited = false,
  hasSchedule = false,
  onSave,
  onCancel,
  onRemove,
  onReset,
  onHide,
}: {
  mode: ItemFormMode;
  item?: CatalogItem;
  /** A built-in item that has been changed from the catalog. */
  isEdited?: boolean;
  hasSchedule?: boolean;
  onSave: (draft: ItemDraft) => void;
  onCancel: () => void;
  onRemove?: () => void;
  onReset?: () => void;
  /** Hide a built-in item from the basket. Reversible, so no confirmation. */
  onHide?: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<CategoryId>(item?.category ?? "staple");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [priceDraft, setPriceDraft] = useState(item ? String(item.price) : "");
  const [portionOn, setPortionOn] = useState(item?.portion !== undefined);
  const [portionLabel, setPortionLabel] = useState(item?.portion?.label ?? "");
  const [perUnitDraft, setPerUnitDraft] = useState(item?.portion ? String(item.portion.perUnit) : "");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const showPrice = mode !== "builtin";
  const price = showPrice ? parseDigits(priceDraft) : (item?.price ?? 0);
  const draft: ItemDraft = {
    name: name.trim(),
    category,
    unit: unit.trim(),
    price,
    portion: portionOn ? { label: portionLabel.trim(), perUnit: parseDigits(perUnitDraft) } : undefined,
  };
  // Same rules the store applies, so the button is only enabled for input it will accept.
  const checked = cleanCustomItem({ id: "custom-check", ...draft });
  const valid = checked !== null && (portionOn ? checked.portion !== undefined : true);

  const reason = !draft.name
    ? "اسم جنس را بنویس."
    : !draft.unit
      ? "واحد خرید را بنویس، مثلاً کیلوگرم یا بسته."
      : showPrice && !(price > 0 && price <= MAX_ITEM_PRICE)
        ? "قیمت هر واحد را به تومان وارد کن."
        : portionOn && !checked?.portion
          ? "واحد مصرف و اینکه چند تا از آن در هر واحد خرید است را وارد کن."
          : null;

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-xl bg-bg p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSave(draft);
      }}
    >
      <label htmlFor={`${id}-name`} className={labelClass}>
        اسم جنس
      </label>
      <span className={fieldClass}>
        <input
          id={`${id}-name`}
          autoFocus={mode === "new"}
          maxLength={MAX_NAME_LENGTH}
          className={inputClass}
          value={name}
          placeholder="مثلاً عسل"
          onChange={(event) => setName(event.target.value)}
        />
      </span>

      <label htmlFor={`${id}-category`} className={labelClass}>
        دسته
      </label>
      <select
        id={`${id}-category`}
        value={category}
        onChange={(event) => setCategory(event.target.value as CategoryId)}
        className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-primary"
      >
        {CATEGORIES.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-unit`} className={labelClass}>
        واحد خرید
      </label>
      <span className={fieldClass}>
        <input
          id={`${id}-unit`}
          maxLength={MAX_UNIT_LENGTH}
          className={inputClass}
          value={unit}
          placeholder="مثلاً کیلوگرم، بسته، شانه"
          onChange={(event) => setUnit(event.target.value)}
        />
      </span>

      {showPrice ? (
        <>
          <label htmlFor={`${id}-price`} className={labelClass}>
            قیمت هر {draft.unit || "واحد"}
          </label>
          <span className={fieldClass}>
            <input
              id={`${id}-price`}
              inputMode="numeric"
              className={`${inputClass} tabular-nums`}
              value={priceDraft}
              placeholder="۰"
              onChange={(event) => setPriceDraft(event.target.value)}
            />
            <span className="shrink-0 text-sm text-muted">تومان</span>
          </span>
          <p className="text-xs leading-5 text-muted tabular-nums">
            {price > 0 ? `${formatWords(price)} تومان` : "مبلغ را به تومان وارد کن"}
          </p>
        </>
      ) : (
        <p className="text-xs leading-5 text-muted">قیمت را با دکمه مداد کنار قیمت عوض کن.</p>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={portionOn}
        onClick={() => setPortionOn((on) => !on)}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-start"
      >
        <span className="text-sm font-bold">برای مصرف روزانه هم باشد (برنامه تکرار)</span>
        <span
          aria-hidden="true"
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
            portionOn ? "bg-primary" : "bg-line"
          }`}
        >
          <span
            className={`size-6 rounded-full bg-surface shadow transition-transform ${
              portionOn ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>

      {portionOn ? (
        <>
          <p className="text-xs leading-5 text-muted">
            مثلاً تخم‌مرغ: واحد خرید «شانه»، واحد مصرف «عدد» و ۳۰ عدد در هر شانه.
          </p>
          <label htmlFor={`${id}-portion`} className={labelClass}>
            واحد مصرف
          </label>
          <span className={fieldClass}>
            <input
              id={`${id}-portion`}
              maxLength={MAX_PORTION_LABEL_LENGTH}
              className={inputClass}
              value={portionLabel}
              placeholder="مثلاً عدد، گرم، میلی‌لیتر"
              onChange={(event) => setPortionLabel(event.target.value)}
            />
          </span>
          <label htmlFor={`${id}-per`} className={labelClass}>
            چند {portionLabel.trim() || "واحد مصرف"} در هر {draft.unit || "واحد خرید"}؟
          </label>
          <span className={fieldClass}>
            <input
              id={`${id}-per`}
              inputMode="numeric"
              className={`${inputClass} tabular-nums`}
              value={perUnitDraft}
              placeholder="۰"
              onChange={(event) => setPerUnitDraft(event.target.value)}
            />
            <span className="shrink-0 text-sm text-muted tabular-nums">
              {parseDigits(perUnitDraft) > 0 ? formatNumber(parseDigits(perUnitDraft)) : ""}
            </span>
          </span>
        </>
      ) : hasSchedule ? (
        <p className="text-xs font-bold leading-5 text-danger">با ذخیره، برنامه تکرار این جنس پاک می‌شود.</p>
      ) : null}

      {reason ? <p className="text-xs leading-5 text-muted">{reason}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
        >
          {mode === "new" ? "افزودن به سبد" : "ذخیره تغییرات"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold"
        >
          انصراف
        </button>
      </div>

      {mode === "builtin" && isEdited && onReset ? (
        <button type="button" className="min-h-11 text-sm font-bold text-primary" onClick={onReset}>
          برگشت به حالت اصلی
        </button>
      ) : null}

      {mode === "builtin" && onHide ? (
        <button
          type="button"
          className="flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-primary"
          onClick={onHide}
        >
          <EyeOff className="size-4" strokeWidth={2} aria-hidden="true" />
          پنهان کردن از سبد
        </button>
      ) : null}

      {mode === "custom" && onRemove ? (
        <button
          type="button"
          className={`min-h-11 text-sm font-bold ${
            confirmRemove ? "rounded-xl bg-danger px-4 text-on-danger" : "text-danger"
          }`}
          onClick={() => {
            if (!confirmRemove) return setConfirmRemove(true);
            onRemove();
          }}
        >
          {confirmRemove ? "بله، این جنس از سبد حذف شود" : "حذف این جنس"}
        </button>
      ) : null}
    </form>
  );
}
