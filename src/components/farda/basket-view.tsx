import { CATEGORIES, CATALOG, PRICE_AS_OF, basketTotal } from "@/lib/farda/catalog";
import { formatCompact, formatToman } from "@/lib/farda/format";
import { usePlan } from "@/lib/farda/store";
import { Stepper } from "./ui";

export function BasketView() {
  const qty = usePlan((s) => s.qty);
  const setQty = usePlan((s) => s.setQty);
  const budget = usePlan((s) => s.budget);
  const total = basketTotal(qty);
  const share = budget > 0 ? Math.round((total / budget) * 100) : 0;
  const left = budget - total;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold">سبد قیمت</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          قیمت‌ها از {PRICE_AS_OF} داخل اپ هستند. مقدار، مصرف یک ماه است؛ لازم نیست خودت قیمت بزنی.
        </p>
      </div>

      <div className="sticky top-16 z-10 -mx-4 border-b border-line bg-bg px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted">جمع سبد</p>
          <p className="text-lg font-extrabold tabular-nums">{formatCompact(total)}</p>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted tabular-nums">
          {share.toLocaleString("fa-IR")}٪ بودجه ·{" "}
          {left >= 0
            ? `${formatCompact(left)} قبل از پس‌انداز هدف می‌ماند`
            : `${formatCompact(Math.abs(left))} از بودجه بیشتر است`}
        </p>
      </div>

      {CATEGORIES.map((category) => {
        const items = CATALOG.filter((item) => item.category === category.id);
        return (
          <section key={category.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-muted">{category.label}</h3>
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const count = qty[item.id] ?? 0;
                const line = count * item.price;
                return (
                  <li
                    key={item.id}
                    className={`rounded-card border px-3 py-3 ${count > 0 ? "border-primary/40 bg-primary-soft" : "border-line bg-surface"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{item.name}</p>
                        <p className="mt-1 text-xs text-muted">هر {item.unit}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums">{formatCompact(item.price)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm tabular-nums text-ink">
                        {count > 0 ? formatToman(line) : "در سبد نیست"}
                      </p>
                      <Stepper
                        label={item.name}
                        value={count}
                        onChange={(next) => setQty(item.id, next)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="text-xs leading-6 text-muted">
        خوراک از میانگین گزارش‌شده برای آبان ۱۴۰۵ است؛ شیر لیتری حدود ۱۴۰ هزار، تخم‌مرغ شانه ۳۰تایی حدود ۵۵۰ هزار،
        مرغ حدود ۳۴۰ هزار، برنج ایرانی حدود ۵۴۵ هزار و روغن مایع حدود ۴۰۴ هزار تومان. اینترنت، تعرفه همراه اول و
        ایرانسل بعد از افزایش اول آبان است. اشتراک‌ها تعرفه یک‌ماهه اعلام‌شده همان ماه‌اند. شهر و فروشگاه فرق می‌کند.
      </p>
    </div>
  );
}
