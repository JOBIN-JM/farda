import { useState } from "react";
import { ChevronDown, Pencil, Plus, Repeat, Settings2 } from "lucide-react";
import { CATEGORIES, basketTotal, defaultPriceOf, priceOf } from "@/lib/farda/catalog";
import { formatCompact, formatNumber, formatToman } from "@/lib/farda/format";
import { describeSchedule, monthlyCount } from "@/lib/farda/schedule";
import { CUSTOM_ID_PREFIX } from "@/lib/farda/items";
import { useItems, useMonthDays, useMonthlyQty, usePlan, usePriceDate, useVisibleItems } from "@/lib/farda/store";
import { ItemForm } from "./item-form";
import { PriceEditor } from "./price-editor";
import { ScheduleEditor } from "./schedule-editor";
import { Stepper } from "./ui";

export function BasketView() {
  const qty = usePlan((s) => s.qty);
  const setQty = usePlan((s) => s.setQty);
  const schedules = usePlan((s) => s.schedules);
  const setSchedule = usePlan((s) => s.setSchedule);
  const monthly = useMonthlyQty();
  const monthDays = useMonthDays();
  const priceOverrides = usePlan((s) => s.priceOverrides);
  const feedPrices = usePlan((s) => s.feed?.prices);
  const priceDate = usePriceDate();
  const setPrice = usePlan((s) => s.setPrice);
  const resetPrice = usePlan((s) => s.resetPrice);
  const budget = usePlan((s) => s.budget);
  const allItems = useItems();
  const items = useVisibleItems();
  const hiddenIds = usePlan((s) => s.hiddenItems);
  const hideItem = usePlan((s) => s.hideItem);
  const showItem = usePlan((s) => s.showItem);
  const hiddenList = allItems.filter((item) => hiddenIds.includes(item.id));
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const itemEdits = usePlan((s) => s.itemEdits);
  const addCustomItem = usePlan((s) => s.addCustomItem);
  const updateCustomItem = usePlan((s) => s.updateCustomItem);
  const removeCustomItem = usePlan((s) => s.removeCustomItem);
  const editItem = usePlan((s) => s.editItem);
  const resetItem = usePlan((s) => s.resetItem);
  type PanelKind = "price" | "schedule" | "item";
  const [panel, setPanel] = useState<{ id: string; kind: PanelKind } | null>(null);
  const [adding, setAdding] = useState(false);
  const toggle = (id: string, kind: PanelKind) =>
    setPanel((current) => (current?.id === id && current.kind === kind ? null : { id, kind }));
  const total = basketTotal(monthly, priceOverrides, feedPrices, items);
  const share = budget > 0 ? Math.round((total / budget) * 100) : 0;
  const left = budget - total;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">سبد قیمت</h2>
          <button
            type="button"
            aria-expanded={adding}
            onClick={() => setAdding((open) => !open)}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-primary"
          >
            <Plus className="size-4" strokeWidth={2.25} aria-hidden="true" />
            جنس جدید
          </button>
        </div>
        {adding ? (
          <ItemForm
            mode="new"
            onSave={(draft) => {
              if (addCustomItem(draft) !== null) setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : null}
        <p className="mt-3 text-sm leading-6 text-muted">
          قیمت‌ها از {priceDate} هستند و مقدار، مصرف یک ماه است. اگر جایی که خرید می‌کنی قیمت فرق
          دارد، روی قیمت بزن و عوضش کن؛ هر وقت خواستی به قیمت پیش‌فرض برمی‌گردد.
        </p>
      </div>

      <div className="sticky top-16 z-10 -mx-4 border-b border-line bg-bg px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted">جمع سبد</p>
          <p className="text-lg font-extrabold tabular-nums">{formatCompact(total)}</p>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted tabular-nums">
          {share.toLocaleString("fa-IR")}٪ بودجه ·{" "}
          {left >= 0 ? (
            `${formatCompact(left)} قبل از پس‌انداز هدف می‌ماند`
          ) : (
            <span className="font-bold text-danger">{formatCompact(Math.abs(left))} از بودجه بیشتر است</span>
          )}
        </p>
      </div>

      {CATEGORIES.map((category) => {
        const categoryItems = items.filter((item) => item.category === category.id);
        if (categoryItems.length === 0) return null;
        return (
          <section key={category.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-muted">{category.label}</h3>
            <ul className="flex flex-col gap-2">
              {categoryItems.map((item) => {
                const isUserItem = item.id.startsWith(CUSTOM_ID_PREFIX);
                const count = monthly[item.id] ?? 0;
                const schedule = schedules[item.id];
                const repeats = schedule !== undefined;
                const defaultPrice = defaultPriceOf(item, feedPrices);
                const price = priceOf(item, priceOverrides, feedPrices);
                const priceEdited = price !== defaultPrice;
                const editing = panel?.id === item.id && panel.kind === "price";
                const scheduling = panel?.id === item.id && panel.kind === "schedule";
                const editingItem = panel?.id === item.id && panel.kind === "item";
                const line = count * price;
                return (
                  <li
                    key={item.id}
                    className={`rounded-card border px-3 py-3 ${count > 0 ? "border-primary/40 bg-primary-soft" : "border-line bg-surface"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">
                          {item.name}
                          {isUserItem ? (
                            <span className="mr-2 rounded-full bg-bg px-2 py-0.5 text-xs font-bold text-primary">
                              جنس من
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-muted">هر {item.unit}</p>
                        {priceEdited && !isUserItem ? (
                          <p className="mt-1 text-xs text-muted tabular-nums">
                            پیش‌فرض {formatCompact(defaultPrice)}
                          </p>
                        ) : null}
                      </div>
                      <div className="-my-1 flex shrink-0 flex-col items-end">
                        <button
                          type="button"
                          aria-expanded={editing}
                          aria-label={`ویرایش قیمت ${item.name}`}
                          onClick={() => toggle(item.id, "price")}
                          className={`flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-bold tabular-nums ${
                            priceEdited ? "text-primary" : ""
                          }`}
                        >
                          {formatCompact(price)}
                          <Pencil className="size-3.5 text-muted" strokeWidth={2} aria-hidden="true" />
                        </button>
                        {priceEdited && !editing && !isUserItem ? (
                          <button
                            type="button"
                            onClick={() => resetPrice(item.id)}
                            className="min-h-9 px-2 text-xs font-bold text-primary"
                          >
                            برگشت به پیش‌فرض
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {editing ? (
                      <PriceEditor
                        item={item}
                        price={price}
                        defaultPrice={defaultPrice}
                        onSave={(next) => setPrice(item.id, next)}
                        onReset={() => resetPrice(item.id)}
                        onClose={() => setPanel(null)}
                      />
                    ) : null}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm tabular-nums text-ink">
                        {count > 0 ? formatToman(line) : "در سبد نیست"}
                      </p>
                      {repeats ? (
                        <p className="text-xs text-muted tabular-nums">
                          تکراری · {formatNumber(monthlyCount(schedule, monthDays))} {item.portion?.label} در این ماه
                        </p>
                      ) : (
                        <Stepper
                          label={item.name}
                          value={qty[item.id] ?? 0}
                          onChange={(next) => setQty(item.id, next)}
                        />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {item.portion ? (
                        <button
                          type="button"
                          aria-expanded={scheduling}
                          onClick={() => toggle(item.id, "schedule")}
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-start text-sm font-bold text-primary"
                        >
                          <Repeat className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                          <span className="min-w-0">
                            {schedule
                              ? describeSchedule(schedule, item.portion.label)
                              : "برنامه تکرار (مثلاً روزهای هفته)"}
                          </span>
                        </button>
                      ) : (
                        <span className="flex-1" />
                      )}
                      <button
                        type="button"
                        aria-expanded={editingItem}
                        aria-label={`ویرایش جنس ${item.name}`}
                        onClick={() => toggle(item.id, "item")}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted"
                      >
                        <Settings2 className="size-5" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                    {editingItem ? (
                      <ItemForm
                        mode={isUserItem ? "custom" : "builtin"}
                        item={item}
                        isEdited={item.id in itemEdits}
                        hasSchedule={repeats}
                        onSave={(draft) => {
                          if (isUserItem) updateCustomItem(item.id, draft);
                          else editItem(item.id, draft);
                          setPanel(null);
                        }}
                        onCancel={() => setPanel(null)}
                        onRemove={() => {
                          removeCustomItem(item.id);
                          setPanel(null);
                        }}
                        onReset={() => {
                          resetItem(item.id);
                          setPanel(null);
                        }}
                        onHide={() => {
                          hideItem(item.id);
                          setPanel(null);
                        }}
                      />
                    ) : null}
                    {scheduling ? (
                      <ScheduleEditor
                        item={item}
                        schedule={schedule}
                        price={price}
                        monthDays={monthDays}
                        onSave={(next) => setSchedule(item.id, next)}
                        onRemove={() => setSchedule(item.id, null)}
                        onClose={() => setPanel(null)}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {hiddenList.length > 0 ? (
        <section className="rounded-card border border-line bg-surface">
          <button
            type="button"
            aria-expanded={hiddenOpen}
            onClick={() => setHiddenOpen((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-sm font-bold"
          >
            جنس‌های پنهان ({formatNumber(hiddenList.length)})
            <ChevronDown
              className={`size-4 text-muted transition-transform ${hiddenOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
          {hiddenOpen ? (
            <ul className="flex flex-col border-t border-line px-3">
              {hiddenList.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-1 last:border-b-0"
                >
                  <p className="min-w-0 text-sm">{item.name}</p>
                  <button
                    type="button"
                    aria-label={`نمایش دوباره ${item.name}`}
                    onClick={() => showItem(item.id)}
                    className="min-h-11 shrink-0 px-2 text-sm font-bold text-primary"
                  >
                    نمایش دوباره
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <p className="text-xs leading-6 text-muted">
        خوراک از میانگین گزارش‌شده برای آبان ۱۴۰۵ است؛ شیر لیتری حدود ۱۴۰ هزار، تخم‌مرغ شانه ۳۰تایی حدود ۵۵۰ هزار،
        مرغ حدود ۳۴۰ هزار، برنج ایرانی حدود ۵۴۵ هزار و روغن مایع حدود ۴۰۴ هزار تومان. اینترنت، تعرفه همراه اول و
        ایرانسل بعد از افزایش اول آبان است. اشتراک‌ها تعرفه یک‌ماهه اعلام‌شده همان ماه‌اند. شهر و فروشگاه فرق می‌کند.
      </p>
    </div>
  );
}
