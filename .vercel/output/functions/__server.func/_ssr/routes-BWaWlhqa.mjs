import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Minus, i as Plus, n as Target, o as House, r as ShoppingBasket, s as ChartColumn } from "../_libs/lucide-react.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
import { a as ResponsiveContainer, i as Area, n as YAxis, o as Tooltip, r as XAxis, t as AreaChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BWaWlhqa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PRICE_AS_OF = "۲۳ آبان ۱۴۰۵";
var CATEGORIES = [
	{
		id: "dairy",
		label: "لبنیات"
	},
	{
		id: "protein",
		label: "پروتئین"
	},
	{
		id: "staple",
		label: "خواربار"
	},
	{
		id: "service",
		label: "خدمات و اشتراک"
	}
];
/**
* Reference prices for Aban 1405 (early November 2026).
* Food: Statistical Center / market watches published that month.
* Internet: MCI and Irancell tariffs after the 1 Aban increase.
* Subscriptions: published monthly plans the same month.
*/
var CATALOG = [
	{
		id: "milk",
		name: "شیر پاستوریزه",
		category: "dairy",
		unit: "لیتر",
		price: 14e4,
		defaultQty: 8
	},
	{
		id: "yogurt",
		name: "ماست پاستوریزه",
		category: "dairy",
		unit: "کیلوگرم",
		price: 185e3,
		defaultQty: 3
	},
	{
		id: "cheese",
		name: "پنیر سفید ۴۰۰ گرمی",
		category: "dairy",
		unit: "بسته",
		price: 195e3,
		defaultQty: 2
	},
	{
		id: "butter",
		name: "کره ۵۰ گرمی",
		category: "dairy",
		unit: "بسته",
		price: 6e4,
		defaultQty: 4
	},
	{
		id: "eggs",
		name: "تخم‌مرغ ۳۰ عددی",
		category: "protein",
		unit: "شانه",
		price: 55e4,
		defaultQty: 2
	},
	{
		id: "chicken",
		name: "مرغ",
		category: "protein",
		unit: "کیلوگرم",
		price: 34e4,
		defaultQty: 4
	},
	{
		id: "lamb",
		name: "گوشت گوسفندی",
		category: "protein",
		unit: "کیلوگرم",
		price: 1825e3,
		defaultQty: 0
	},
	{
		id: "beef",
		name: "گوشت گوساله",
		category: "protein",
		unit: "کیلوگرم",
		price: 1864e3,
		defaultQty: 0
	},
	{
		id: "rice-ir",
		name: "برنج ایرانی درجه یک",
		category: "staple",
		unit: "کیلوگرم",
		price: 545e3,
		defaultQty: 3
	},
	{
		id: "rice-for",
		name: "برنج خارجی",
		category: "staple",
		unit: "کیلوگرم",
		price: 29e4,
		defaultQty: 0
	},
	{
		id: "oil",
		name: "روغن مایع ۹۰۰ میلی‌لیتری",
		category: "staple",
		unit: "بطری",
		price: 404e3,
		defaultQty: 2
	},
	{
		id: "tea",
		name: "چای ایرانی ۴۵۰ گرمی",
		category: "staple",
		unit: "بسته",
		price: 775e3,
		defaultQty: 1
	},
	{
		id: "net-5",
		name: "اینترنت همراه ۵ گیگ",
		category: "service",
		unit: "۳۰ روز",
		price: 62660,
		defaultQty: 0
	},
	{
		id: "net-50",
		name: "اینترنت همراه ۵۰ گیگ",
		category: "service",
		unit: "۳۰ روز",
		price: 590590,
		defaultQty: 1
	},
	{
		id: "fiber",
		name: "فیبر نوری ۵۵ گیگ",
		category: "service",
		unit: "ماه",
		price: 277200,
		defaultQty: 0
	},
	{
		id: "tdlte",
		name: "اینترنت ثابت ۳۰ گیگ",
		category: "service",
		unit: "ماه",
		price: 172460,
		defaultQty: 0
	},
	{
		id: "filimo",
		name: "اشتراک فیلیمو",
		category: "service",
		unit: "ماه، با تبلیغ",
		price: 308e3,
		defaultQty: 0
	},
	{
		id: "namava",
		name: "اشتراک نماوا",
		category: "service",
		unit: "ماه",
		price: 19e4,
		defaultQty: 0
	},
	{
		id: "filmnet",
		name: "اشتراک فیلم‌نت",
		category: "service",
		unit: "ماه",
		price: 195e3,
		defaultQty: 0
	}
];
var INFLATION_PRESETS = [
	{
		id: "cbi",
		label: "رسمی سالانه",
		rate: 71.4,
		hint: "بانک مرکزی، مهر ۱۴۰۵"
	},
	{
		id: "yoy",
		label: "نقطه‌به‌نقطه",
		rate: 83.5,
		hint: "شاخص شهری"
	},
	{
		id: "goods",
		label: "کالای بادوام",
		rate: 100,
		hint: "تورم کالا از ۱۰۰٪ گذشت"
	},
	{
		id: "hope",
		label: "خوش‌بینانه",
		rate: 40,
		hint: "اگر آهنگ رشد کم شود"
	}
];
var GOAL_PRESETS = [
	{
		name: "گوشی",
		price: 45e6,
		annualInflation: 100
	},
	{
		name: "لپ‌تاپ",
		price: 85e6,
		annualInflation: 100
	},
	{
		name: "موتور",
		price: 22e7,
		annualInflation: 100
	},
	{
		name: "یخچال",
		price: 6e7,
		annualInflation: 71.4
	},
	{
		name: "سفر",
		price: 3e7,
		annualInflation: 71.4
	}
];
function basketTotal(qty) {
	return CATALOG.reduce((sum, item) => sum + item.price * (qty[item.id] ?? 0), 0);
}
function categoryTotals(qty) {
	return CATEGORIES.map((category) => ({
		...category,
		total: CATALOG.filter((item) => item.category === category.id).reduce((sum, item) => sum + item.price * (qty[item.id] ?? 0), 0)
	})).filter((category) => category.total > 0);
}
/** Savings that must meet a price which itself grows with inflation. */
var HORIZON_MONTHS = [
	6,
	12,
	18,
	24
];
function monthlyRate(annualPct) {
	if (annualPct <= 0) return 0;
	return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}
/** Price after `months`, given an annual inflation rate (12 months = exactly 1 + rate). */
function futurePrice(present, annualInflationPct, months) {
	if (present <= 0 || months <= 0) return Math.max(0, Math.round(present));
	const grown = present * Math.pow(1 + annualInflationPct / 100, months / 12);
	return Math.round(grown);
}
/** What a fixed monthly deposit grows into, payments at each month-end. */
function accumulated(monthly, months, depositAnnualPct) {
	if (monthly <= 0 || months <= 0) return 0;
	const i = monthlyRate(depositAnnualPct);
	if (i <= 1e-8) return Math.round(monthly * months);
	const factor = (Math.pow(1 + i, months) - 1) / i;
	return Math.round(monthly * factor);
}
/**
* Fixed toman to set aside each month so the pot equals the inflated price.
* Deposit interest is optional and defaults to zero — typical Iranian deposits
* do not keep up with inflation, so zero is the honest baseline.
*/
function monthlySetAside(present, annualInflationPct, months, depositAnnualPct = 0) {
	if (present <= 0 || months <= 0) return 0;
	const target = futurePrice(present, annualInflationPct, months);
	const i = monthlyRate(depositAnnualPct);
	if (i <= 1e-8) return Math.round(target / months);
	const factor = (Math.pow(1 + i, months) - 1) / i;
	return Math.round(target / factor);
}
function savingsPlan(present, annualInflationPct, months, depositAnnualPct = 0) {
	const future = futurePrice(present, annualInflationPct, months);
	const monthly = monthlySetAside(present, annualInflationPct, months, depositAnnualPct);
	const naiveMonthly = months > 0 && present > 0 ? Math.round(present / months) : 0;
	const naiveAccumulated = accumulated(naiveMonthly, months, depositAnnualPct);
	return {
		future,
		monthly,
		naiveMonthly,
		naiveAccumulated,
		shortfall: Math.max(0, future - naiveAccumulated)
	};
}
function snapMonths(months) {
	return HORIZON_MONTHS.includes(months) ? months : 12;
}
function clampRate(n, max = 300) {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(max, Math.round(n * 10) / 10));
}
function defaultGoal() {
	return {
		id: "goal-phone",
		name: "گوشی",
		price: 45e6,
		months: 12,
		annualInflation: 100,
		depositAnnual: 0,
		saved: 0,
		checkInKey: null
	};
}
function defaultQty() {
	const qty = {};
	for (const item of CATALOG) if (item.defaultQty > 0) qty[item.id] = item.defaultQty;
	return qty;
}
function freshPersisted() {
	const goal = defaultGoal();
	return {
		budget: 3e7,
		qty: defaultQty(),
		householdInflation: 71.4,
		goals: [goal],
		activeGoalId: goal.id
	};
}
var memoryStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {}
};
var usePlan = create()(persist((set, get) => ({
	...freshPersisted(),
	setBudget: (n) => set({ budget: Math.max(0, Math.round(n)) }),
	setQty: (id, n) => set({ qty: {
		...get().qty,
		[id]: Math.max(0, Math.min(99, Math.round(n)))
	} }),
	setHouseholdInflation: (n) => set({ householdInflation: clampRate(n) }),
	patchGoal: (id, patch) => set({ goals: get().goals.map((goal) => {
		if (goal.id !== id) return goal;
		return {
			...goal,
			name: patch.name !== void 0 ? patch.name.slice(0, 32) : goal.name,
			price: patch.price !== void 0 ? Math.max(0, Math.round(patch.price)) : goal.price,
			months: patch.months !== void 0 ? snapMonths(patch.months) : goal.months,
			annualInflation: patch.annualInflation !== void 0 ? clampRate(patch.annualInflation) : goal.annualInflation,
			depositAnnual: patch.depositAnnual !== void 0 ? clampRate(patch.depositAnnual, 80) : goal.depositAnnual
		};
	}) }),
	addGoal: (draft) => {
		if (get().goals.length >= 8) return;
		const goal = {
			id: `goal-${crypto.randomUUID()}`,
			name: draft.name.slice(0, 32) || "هدف جدید",
			price: Math.max(0, Math.round(draft.price)),
			months: 12,
			annualInflation: clampRate(draft.annualInflation),
			depositAnnual: 0,
			saved: 0,
			checkInKey: null
		};
		set({
			goals: [...get().goals, goal],
			activeGoalId: goal.id
		});
	},
	removeGoal: (id) => {
		const goals = get().goals.filter((goal) => goal.id !== id);
		set({
			goals,
			activeGoalId: get().activeGoalId === id ? goals[0]?.id ?? "" : get().activeGoalId
		});
	},
	selectGoal: (id) => set({ activeGoalId: id }),
	checkIn: (id, monthKey) => {
		const goal = get().goals.find((item) => item.id === id);
		if (!goal || goal.checkInKey === monthKey || goal.price <= 0) return;
		const add = monthlySetAside(goal.price, goal.annualInflation, goal.months, goal.depositAnnual);
		set({ goals: get().goals.map((item) => item.id === id ? {
			...item,
			saved: item.saved + add,
			checkInKey: monthKey
		} : item) });
	},
	undoCheckIn: (id, monthKey) => {
		const goal = get().goals.find((item) => item.id === id);
		if (!goal || goal.checkInKey !== monthKey) return;
		const add = monthlySetAside(goal.price, goal.annualInflation, goal.months, goal.depositAnnual);
		set({ goals: get().goals.map((item) => item.id === id ? {
			...item,
			saved: Math.max(0, item.saved - add),
			checkInKey: null
		} : item) });
	},
	reset: () => set(freshPersisted())
}), {
	name: "farda-plan-v1",
	storage: createJSONStorage(() => typeof window === "undefined" ? memoryStorage : localStorage),
	skipHydration: true,
	partialize: (state) => ({
		budget: state.budget,
		qty: state.qty,
		householdInflation: state.householdInflation,
		goals: state.goals,
		activeGoalId: state.activeGoalId
	}),
	merge: (persisted, current) => {
		if (!persisted || typeof persisted !== "object") return current;
		const saved = persisted;
		const goals = (saved.goals ?? current.goals).map((goal) => ({
			...defaultGoal(),
			...goal,
			months: snapMonths(goal.months ?? 12),
			depositAnnual: goal.depositAnnual ?? 0,
			saved: goal.saved ?? 0,
			checkInKey: goal.checkInKey ?? null
		}));
		const activeGoalId = goals.some((goal) => goal.id === saved.activeGoalId) ? saved.activeGoalId : goals[0]?.id ?? "";
		return {
			...current,
			budget: typeof saved.budget === "number" ? saved.budget : current.budget,
			qty: saved.qty ?? current.qty,
			householdInflation: typeof saved.householdInflation === "number" ? saved.householdInflation : current.householdInflation,
			goals,
			activeGoalId
		};
	}
}));
var PERSIAN = "۰۱۲۳۴۵۶۷۸۹";
var ARABIC = "٠١٢٣٤٥٦٧٨٩";
function foldDigits(raw) {
	return raw.replace(/[۰-۹]/g, (ch) => String(PERSIAN.indexOf(ch))).replace(/[٠-٩]/g, (ch) => String(ARABIC.indexOf(ch))).replace(/٫/g, ".").replace(/,/g, ".");
}
function parseDigits(raw) {
	const normalized = foldDigits(raw).replace(/[^\d]/g, "");
	if (!normalized) return 0;
	return Number(normalized);
}
function parseDecimal(raw) {
	const normalized = foldDigits(raw).replace(/[^\d.]/g, "");
	const n = Number(normalized);
	return Number.isFinite(n) ? n : 0;
}
function formatNumber(n) {
	return Math.round(n).toLocaleString("fa-IR");
}
function formatDecimal(n) {
	return n.toLocaleString("fa-IR", { maximumFractionDigits: 1 });
}
function formatToman(n) {
	return `${formatNumber(n)} تومان`;
}
function formatCompact(n) {
	const sign = n < 0 ? "−" : "";
	const v = Math.abs(n);
	if (v >= 1e9) return `${sign}${(v / 1e9).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیارد`;
	if (v >= 1e6) {
		const x = v / 1e6;
		const digits = x >= 10 ? 1 : 2;
		return `${sign}${x.toLocaleString("fa-IR", { maximumFractionDigits: digits })} میلیون`;
	}
	if (v >= 1e4) return `${sign}${Math.round(v / 1e3).toLocaleString("fa-IR")} هزار`;
	return `${sign}${formatNumber(v)}`;
}
function formatPercent(n) {
	return `${n.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}
function persianMonthKey(date = /* @__PURE__ */ new Date()) {
	const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
		year: "numeric",
		month: "2-digit"
	}).formatToParts(date);
	return `${parts.find((p) => p.type === "year")?.value ?? "0"}-${(parts.find((p) => p.type === "month")?.value ?? "0").padStart(2, "0")}`;
}
function persianMonthLabel(date = /* @__PURE__ */ new Date()) {
	return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
		month: "long",
		year: "numeric"
	}).format(date);
}
function MoneyField({ id, label, value, onChange }) {
	const [focused, setFocused] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		htmlFor: id,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-2 block text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id,
				inputMode: "numeric",
				className: "min-h-11 w-full bg-transparent py-2 text-base text-ink tabular-nums outline-none",
				value: focused ? draft : value ? formatNumber(value) : "",
				placeholder: "۰",
				onFocus: () => {
					setFocused(true);
					setDraft(value ? String(value) : "");
				},
				onBlur: () => setFocused(false),
				onChange: (event) => {
					setDraft(event.target.value);
					onChange(parseDigits(event.target.value));
				}
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "shrink-0 text-sm text-muted",
				children: "تومان"
			})]
		})]
	});
}
function PercentField({ id, label, value, onChange }) {
	const [focused, setFocused] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		htmlFor: id,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-2 block text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id,
				inputMode: "decimal",
				className: "min-h-11 w-full bg-transparent py-2 text-base text-ink tabular-nums outline-none",
				value: focused ? draft : formatDecimal(value),
				onFocus: () => {
					setFocused(true);
					setDraft(String(value));
				},
				onBlur: () => setFocused(false),
				onChange: (event) => {
					setDraft(event.target.value);
					onChange(parseDecimal(event.target.value));
				}
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "shrink-0 text-sm text-muted",
				children: "٪ سالانه"
			})]
		})]
	});
}
function Stepper({ value, onChange, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center rounded-xl border border-line bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "flex size-11 items-center justify-center text-ink disabled:text-line",
				"aria-label": `کم کردن ${label}`,
				disabled: value <= 0,
				onClick: () => onChange(value - 1),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
					className: "size-4",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-8 text-center text-base tabular-nums",
				children: value.toLocaleString("fa-IR")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "flex size-11 items-center justify-center text-ink disabled:text-line",
				"aria-label": `افزودن ${label}`,
				disabled: value >= 99,
				onClick: () => onChange(value + 1),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
					className: "size-4",
					strokeWidth: 2
				})
			})
		]
	});
}
function Card({ children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: `rounded-card border border-line bg-surface p-4 ${className}`,
		children
	});
}
function BasketView() {
	const qty = usePlan((s) => s.qty);
	const setQty = usePlan((s) => s.setQty);
	const budget = usePlan((s) => s.budget);
	const total = basketTotal(qty);
	const share = budget > 0 ? Math.round(total / budget * 100) : 0;
	const left = budget - total;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-extrabold",
				children: "سبد قیمت"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm leading-6 text-muted",
				children: [
					"قیمت‌ها از ",
					PRICE_AS_OF,
					" داخل اپ هستند. مقدار، مصرف یک ماه است؛ لازم نیست خودت قیمت بزنی."
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sticky top-16 z-10 -mx-4 border-b border-line bg-bg px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "جمع سبد"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg font-extrabold tabular-nums",
						children: formatCompact(total)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-xs leading-5 text-muted tabular-nums",
					children: [
						share.toLocaleString("fa-IR"),
						"٪ بودجه ·",
						" ",
						left >= 0 ? `${formatCompact(left)} قبل از پس‌انداز هدف می‌ماند` : `${formatCompact(Math.abs(left))} از بودجه بیشتر است`
					]
				})]
			}),
			CATEGORIES.map((category) => {
				const items = CATALOG.filter((item) => item.category === category.id);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "flex flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-muted",
						children: category.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-2",
						children: items.map((item) => {
							const count = qty[item.id] ?? 0;
							const line = count * item.price;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: `rounded-card border px-3 py-3 ${count > 0 ? "border-primary/40 bg-primary-soft" : "border-line bg-surface"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-bold",
											children: item.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 text-xs text-muted",
											children: ["هر ", item.unit]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "shrink-0 text-sm font-bold tabular-nums",
										children: formatCompact(item.price)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex items-center justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm tabular-nums text-ink",
										children: count > 0 ? formatToman(line) : "در سبد نیست"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stepper, {
										label: item.name,
										value: count,
										onChange: (next) => setQty(item.id, next)
									})]
								})]
							}, item.id);
						})
					})]
				}, category.id);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-6 text-muted",
				children: "خوراک از میانگین گزارش‌شده برای آبان ۱۴۰۵ است؛ شیر لیتری حدود ۱۴۰ هزار، تخم‌مرغ شانه ۳۰تایی حدود ۵۵۰ هزار، مرغ حدود ۳۴۰ هزار، برنج ایرانی حدود ۵۴۵ هزار و روغن مایع حدود ۴۰۴ هزار تومان. اینترنت، تعرفه همراه اول و ایرانسل بعد از افزایش اول آبان است. اشتراک‌ها تعرفه یک‌ماهه اعلام‌شده همان ماه‌اند. شهر و فروشگاه فرق می‌کند."
			})
		]
	});
}
function GoalView() {
	const goals = usePlan((s) => s.goals);
	const activeGoalId = usePlan((s) => s.activeGoalId);
	const selectGoal = usePlan((s) => s.selectGoal);
	const patchGoal = usePlan((s) => s.patchGoal);
	const addGoal = usePlan((s) => s.addGoal);
	const removeGoal = usePlan((s) => s.removeGoal);
	const goal = goals.find((item) => item.id === activeGoalId) ?? goals[0];
	const [mounted, setMounted] = (0, import_react.useState)(false);
	const [reduceMotion, setReduceMotion] = (0, import_react.useState)(false);
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setMounted(true);
		setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}, []);
	(0, import_react.useEffect)(() => {
		setConfirmDelete(false);
	}, [goal?.id]);
	const plan = goal ? savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual) : null;
	const chart = (0, import_react.useMemo)(() => {
		if (!goal || goal.price <= 0) return [];
		const marks = [0];
		const step = goal.months <= 6 ? 1 : goal.months <= 12 ? 2 : 3;
		for (let month = step; month < goal.months; month += step) marks.push(month);
		if (marks[marks.length - 1] !== goal.months) marks.push(goal.months);
		return marks.map((month) => ({
			label: month === 0 ? "امروز" : `${month.toLocaleString("fa-IR")} ماه`,
			price: futurePrice(goal.price, goal.annualInflation, month)
		}));
	}, [goal]);
	if (!goal || !plan) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-lg font-bold",
			children: "هدفی نمانده"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm leading-6 text-muted",
			children: "یکی از خریدهای زیر را اضافه کن."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetRow, {
			disabled: false,
			onAdd: addGoal
		})
	] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-extrabold",
				children: "هدف خرید"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm leading-6 text-muted",
				children: "قسط را روی قیمت روز خرید حساب می‌کنیم، نه برچسب امروز."
			})] }),
			goals.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-x-auto pb-1",
				children: goals.map((item) => {
					const active = item.id === goal.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => selectGoal(item.id),
						className: `min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${active ? "bg-ink text-on-primary" : "bg-surface text-ink border border-line"}`,
						children: item.name || "بدون نام"
					}, item.id);
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-card bg-ink p-5 text-on-primary",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-on-primary/70",
						children: "هر ماه کنار بگذار"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-4xl font-extrabold leading-tight tabular-nums",
						children: goal.price > 0 ? formatCompact(plan.monthly) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-6 text-on-primary/80 tabular-nums",
						children: goal.price > 0 ? `${formatToman(plan.monthly)} · قیمت بعد از ${goal.months.toLocaleString("fa-IR")} ماه: ${formatToman(plan.future)}` : "اول قیمت امروز هدف را وارد کن."
					})
				]
			}),
			goal.price > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: "اگر تورم را خط بزنی"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-lg font-extrabold tabular-nums",
							children: formatCompact(plan.naiveMonthly)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs leading-5 text-muted",
							children: "در ماه، فقط بر اساس قیمت امروز"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "bg-primary-soft p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [
								"با تورم ",
								formatDecimal(goal.annualInflation),
								"٪"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-lg font-extrabold tabular-nums text-primary",
							children: formatCompact(plan.monthly)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs leading-5 text-muted",
							children: plan.shortfall > 0 ? `${formatCompact(plan.shortfall)} کسری در پایان` : "با این فرض، به قیمت روز خرید می‌رسی"
						})
					]
				})]
			}) : null,
			mounted && chart.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-bold",
					children: "مسیر قیمت تا روز خرید"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted",
					children: "از چپ، امروز. به راست، موعد خرید."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 h-44 w-full",
					dir: "ltr",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
							data: chart,
							margin: {
								top: 8,
								right: 0,
								left: 0,
								bottom: 0
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "label",
									tick: {
										fill: "var(--color-muted)",
										fontSize: 11
									},
									axisLine: false,
									tickLine: false,
									interval: "preserveStartEnd"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									hide: true,
									domain: ["dataMin", "dataMax"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									formatter: (value) => [formatToman(Number(value ?? 0)), "قیمت"],
									labelFormatter: (label) => String(label),
									contentStyle: {
										background: "var(--color-surface)",
										border: "1px solid var(--color-line)",
										borderRadius: 12,
										fontSize: 12,
										direction: "rtl"
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									type: "monotone",
									dataKey: "price",
									stroke: "var(--color-primary)",
									fill: "var(--color-primary-soft)",
									strokeWidth: 2,
									isAnimationActive: !reduceMotion
								})
							]
						})
					})
				})
			] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block",
						htmlFor: "goal-name",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mb-2 block text-sm text-muted",
							children: "نام هدف"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "goal-name",
							value: goal.name,
							maxLength: 32,
							onChange: (event) => patchGoal(goal.id, { name: event.target.value }),
							className: "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base outline-none focus:border-primary"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoneyField, {
						id: "goal-price",
						label: "قیمت امروز هدف",
						value: goal.price,
						onChange: (price) => patchGoal(goal.id, { price })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-sm text-muted",
						children: "چند ماه تا خرید"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-4 gap-2",
						children: HORIZON_MONTHS.map((months) => {
							const active = goal.months === months;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => patchGoal(goal.id, { months }),
								className: `min-h-11 rounded-xl text-sm font-bold tabular-nums ${active ? "bg-primary text-on-primary" : "bg-bg text-ink"}`,
								children: months.toLocaleString("fa-IR")
							}, months);
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-sm text-muted",
						children: "نرخ تورم سالانه"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 gap-2",
						children: INFLATION_PRESETS.map((preset) => {
							const active = goal.annualInflation === preset.rate;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => patchGoal(goal.id, { annualInflation: preset.rate }),
								className: `min-h-14 rounded-xl px-3 py-2 text-right ${active ? "bg-ink text-on-primary" : "bg-bg text-ink"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-sm font-bold",
									children: preset.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `mt-0.5 block text-xs ${active ? "text-on-primary/75" : "text-muted"}`,
									children: preset.hint
								})]
							}, preset.id);
						})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PercentField, {
						id: "inflation",
						label: "یا نرخ خودت",
						value: goal.annualInflation,
						onChange: (annualInflation) => patchGoal(goal.id, { annualInflation })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PercentField, {
						id: "deposit",
						label: "سود سالانه سپرده، اگر هست",
						value: goal.depositAnnual,
						onChange: (depositAnnual) => patchGoal(goal.id, { depositAnnual })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 flex-1 rounded-xl bg-bg text-sm font-bold",
							onClick: () => patchGoal(goal.id, { depositAnnual: 0 }),
							children: "بدون سود"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 flex-1 rounded-xl bg-bg text-sm font-bold",
							onClick: () => patchGoal(goal.id, { depositAnnual: 20 }),
							children: "سناریوی سود ۲۰٪"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs leading-6 text-muted",
						children: "سود ۲۰٪ یک سناریو است، نه نرخ رسمی امروز. در تورم بالا معمولاً سود سپرده از رشد قیمت عقب می‌ماند؛ برای همین حالت پیش‌فرض، بدون سود است."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-bold",
					children: "یک هدف دیگر"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs leading-6 text-muted",
					children: "قیمت‌های نمونه را عوض کن. اپ فقط تورم را حساب می‌کند."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetRow, {
					disabled: goals.length >= 8,
					onAdd: addGoal
				}),
				goals.length >= 8 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs text-muted",
					children: "حداکثر ۸ هدف."
				}) : null
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				className: "rounded-card border border-line bg-surface px-4 py-3 text-sm leading-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
						className: "cursor-pointer font-bold",
						children: "منطق محاسبه"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-muted",
						children: "قیمت آینده = قیمت امروز × (۱ + تورم سالانه) به توان (ماه ÷ ۱۲). بعد قسط ثابت طوری بسته می‌شود که در پایان مدت، با سود سپرده اگر وارد کرده باشی، به همان قیمت آینده برسد. اگر سود صفر باشد، قسط همان قیمت آینده تقسیم بر تعداد ماه است."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-muted",
						children: "خطای رایج این است که قیمت امروز را بر ماه‌ها تقسیم کنیم. آن مبلغ به قیمت روز خرید نمی‌رسد."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "min-h-11 text-sm font-bold text-primary",
				onClick: () => {
					if (!confirmDelete) {
						setConfirmDelete(true);
						return;
					}
					removeGoal(goal.id);
				},
				children: confirmDelete ? "بله، این هدف پاک شود" : "حذف این هدف"
			})
		]
	});
}
function PresetRow({ disabled, onAdd }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-3 flex flex-wrap gap-2",
		children: GOAL_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			disabled,
			onClick: () => onAdd(preset),
			className: "min-h-11 rounded-full border border-line bg-bg px-4 text-sm font-bold disabled:opacity-40",
			children: preset.name
		}, preset.name))
	});
}
function HomeView({ onOpenGoal }) {
	const budget = usePlan((s) => s.budget);
	const qty = usePlan((s) => s.qty);
	const setBudget = usePlan((s) => s.setBudget);
	const goals = usePlan((s) => s.goals);
	const activeGoalId = usePlan((s) => s.activeGoalId);
	const householdInflation = usePlan((s) => s.householdInflation);
	const checkIn = usePlan((s) => s.checkIn);
	const undoCheckIn = usePlan((s) => s.undoCheckIn);
	const [monthKey, setMonthKey] = (0, import_react.useState)(null);
	const [monthLabel, setMonthLabel] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setMonthKey(persianMonthKey());
		setMonthLabel(persianMonthLabel());
	}, []);
	const goal = goals.find((item) => item.id === activeGoalId) ?? goals[0];
	const basket = basketTotal(qty);
	const plan = goal ? savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual) : null;
	const save = plan?.monthly ?? 0;
	const committed = basket + save;
	const left = budget - committed;
	const over = left < 0;
	const futureBasket = futurePrice(basket, householdInflation, 12);
	const basketShare = budget > 0 ? basket / budget * 100 : 0;
	const futureShare = budget > 0 ? futureBasket / budget * 100 : 0;
	const scale = Math.max(budget, committed, 1);
	const basketWidth = basket / scale * 100;
	const saveWidth = save / scale * 100;
	const checked = Boolean(goal && monthKey && goal.checkInKey === monthKey);
	const progress = plan && goal && plan.future > 0 ? Math.min(100, goal.saved / plan.future * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			goal && plan ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-card bg-primary p-5 text-on-primary",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-on-primary/80",
						children: ["کنارگذاشت ", monthLabel ?? "این ماه"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-4xl font-extrabold leading-tight tabular-nums",
						children: formatCompact(plan.monthly)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm leading-6 text-on-primary/90",
						children: [
							"برای ",
							goal.name,
							". قیمت روز خرید",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold tabular-nums",
								children: formatCompact(plan.future)
							}),
							" ",
							"است، نه ",
							formatCompact(goal.price),
							" امروز."
						]
					}),
					plan.shortfall > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-sm leading-6 text-on-primary/85",
						children: [
							"اگر فقط قیمت امروز را تقسیم کنی، سرِ موعد حدود",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold tabular-nums",
								children: formatCompact(plan.shortfall)
							}),
							" کم می‌آوری."
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 h-1.5 overflow-hidden rounded-full bg-on-primary/25",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-on-primary",
							style: { width: `${progress}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-on-primary/80 tabular-nums",
						children: [
							"ثبت‌شده ",
							formatCompact(goal.saved),
							" از ",
							formatCompact(plan.future)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-4 min-h-11 w-full rounded-xl bg-on-primary px-4 text-sm font-bold text-primary disabled:opacity-70",
						disabled: !monthKey,
						onClick: () => {
							if (!monthKey) return;
							if (checked) undoCheckIn(goal.id, monthKey);
							else checkIn(goal.id, monthKey);
						},
						children: checked ? "برگردان ثبت این ماه" : "این ماه را کنار گذاشتم"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-bold",
					children: "هنوز هدفی نداری"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-6 text-muted",
					children: "یک خرید بگذار تا به‌جای قیمت امروز، قیمت روز خرید را قسط کنیم."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-4 min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary",
					onClick: onOpenGoal,
					children: "تعریف هدف خرید"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-bold",
						children: "بودجه این ماه"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: `text-sm font-bold tabular-nums ${over ? "text-primary" : "text-ink"}`,
						children: over ? `${formatCompact(Math.abs(left))} جلو افتادی` : `${formatCompact(left)} می‌ماند`
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoneyField, {
					id: "budget",
					label: "درآمد یا بودجه‌ای که واقعاً در اختیار داری",
					value: budget,
					onChange: setBudget
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex h-3 overflow-hidden rounded-full bg-line",
					role: "img",
					"aria-label": "تقسیم بودجه بین سبد، پس‌انداز و باقی‌مانده",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-ink",
						style: { width: `${basketWidth}%` }
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-primary",
						style: { width: `${saveWidth}%` }
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-3 grid grid-cols-3 gap-2 text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted",
							children: "سبد"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 font-bold tabular-nums",
							children: formatCompact(basket)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted",
							children: "پس‌انداز هدف"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 font-bold tabular-nums text-primary",
							children: formatCompact(save)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted",
							children: "آزاد"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 font-bold tabular-nums",
							children: over ? "—" : formatCompact(left)
						})] })
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-bold",
					children: "سبد همین خانه، سال بعد"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm leading-6 text-muted",
					children: [
						"اگر تورم رسمی ",
						formatPercent(householdInflation),
						" بماند و بودجه تکان نخورد، همین خرید ماهانه گران‌تر می‌شود."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-2 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-bg p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "امروز"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-lg font-extrabold tabular-nums",
								children: formatCompact(basket)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted tabular-nums",
								children: [formatPercent(basketShare), " بودجه"]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-primary-soft p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "۱۲ ماه بعد"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-lg font-extrabold tabular-nums text-primary",
								children: formatCompact(futureBasket)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted tabular-nums",
								children: [formatPercent(futureShare), " بودجه امروز"]
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-sm leading-6",
					children: [
						"اختلاف ماهانه حدود",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-bold tabular-nums",
							children: formatToman(Math.max(0, futureBasket - basket))
						}),
						" ",
						"است. این را هم باید جایی در بودجه جا بدهی."
					]
				})
			] })
		]
	});
}
var HORIZONS = [
	6,
	12,
	18
];
function ReportView() {
	const qty = usePlan((s) => s.qty);
	const budget = usePlan((s) => s.budget);
	const goals = usePlan((s) => s.goals);
	const householdInflation = usePlan((s) => s.householdInflation);
	const setHouseholdInflation = usePlan((s) => s.setHouseholdInflation);
	const reset = usePlan((s) => s.reset);
	const [confirmReset, setConfirmReset] = (0, import_react.useState)(false);
	const basket = basketTotal(qty);
	const categories = categoryTotals(qty);
	const maxCategory = Math.max(...categories.map((item) => item.total), 1);
	const save = goals.reduce((sum, goal) => sum + savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual).monthly, 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-extrabold",
				children: "گزارش"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm leading-6 text-muted",
				children: "خرج امروز یک طرف، فشاری که تورم به ماه‌های بعد می‌آورد طرف دیگر."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-bold",
					children: "سبد به تفکیک"
				}),
				categories.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "هنوز مقداری برای سبد نگذاشتی."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 flex flex-col gap-3",
					children: categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-1 flex items-baseline justify-between gap-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-bold",
							children: category.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums text-muted",
							children: formatToman(category.total)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-2 overflow-hidden rounded-full bg-line",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full rounded-full bg-ink",
							style: { width: `${category.total / maxCategory * 100}%` }
						})
					})] }, category.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-sm tabular-nums",
					children: [
						"جمع سبد ",
						formatCompact(basket),
						budget > 0 ? ` · ${formatPercent(basket / budget * 100)} بودجه` : ""
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-bold",
					children: "تورم روی همین سبد"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid grid-cols-2 gap-2",
					children: INFLATION_PRESETS.map((preset) => {
						const active = householdInflation === preset.rate;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setHouseholdInflation(preset.rate),
							className: `min-h-11 rounded-xl px-3 text-sm font-bold ${active ? "bg-primary text-on-primary" : "bg-bg text-ink"}`,
							children: preset.label
						}, preset.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 flex flex-col gap-2",
					children: HORIZONS.map((months) => {
						const future = futurePrice(basket, householdInflation, months);
						const extra = Math.max(0, future - basket);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm font-bold",
								children: [months.toLocaleString("fa-IR"), " ماه بعد"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted tabular-nums",
								children: [formatCompact(extra), " گران‌تر از امروز"]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-base font-extrabold tabular-nums",
								children: formatCompact(future)
							})]
						}, months);
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-bold",
					children: "پس‌انداز هدف‌ها"
				}),
				goals.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "هدفی تعریف نشده."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-col gap-3",
					children: goals.map((goal) => {
						const plan = savingsPlan(goal.price, goal.annualInflation, goal.months, goal.depositAnnual);
						const share = budget > 0 ? plan.monthly / budget * 100 : 0;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-bold",
								children: goal.name || "بدون نام"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs leading-5 text-muted",
								children: [
									goal.months.toLocaleString("fa-IR"),
									" ماه · تورم ",
									formatPercent(goal.annualInflation),
									" · روز خرید",
									" ",
									formatCompact(plan.future)
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-extrabold tabular-nums text-primary",
									children: formatCompact(plan.monthly)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-xs text-muted tabular-nums",
									children: [formatPercent(share), " بودجه"]
								})]
							})]
						}, goal.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 border-t border-line pt-3 text-sm tabular-nums",
					children: [
						"جمع قسط‌ها ",
						formatCompact(save),
						budget > 0 ? ` · با سبد روی هم ${formatCompact(basket + save)}` : ""
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "min-h-11 text-sm font-bold text-primary",
				onClick: () => {
					if (!confirmReset) {
						setConfirmReset(true);
						return;
					}
					reset();
					setConfirmReset(false);
				},
				children: confirmReset ? "بله، برنامه به حالت اول برگردد" : "بازنشانی برنامه"
			})
		]
	});
}
var TABS = [
	{
		id: "home",
		label: "خانه",
		icon: House
	},
	{
		id: "basket",
		label: "سبد",
		icon: ShoppingBasket
	},
	{
		id: "goal",
		label: "هدف",
		icon: Target
	},
	{
		id: "report",
		label: "گزارش",
		icon: ChartColumn
	}
];
function AppShell() {
	const [tab, setTab] = (0, import_react.useState)("home");
	(0, import_react.useEffect)(() => {
		usePlan.persist.rehydrate();
	}, []);
	(0, import_react.useEffect)(() => {
		window.scrollTo(0, 0);
	}, [tab]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-30 h-16 border-b border-line bg-bg/95 backdrop-blur",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-full w-full max-w-xl items-center justify-between px-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs leading-4 text-muted",
						children: "برنامه‌ریز تورم"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-xl font-extrabold leading-none",
						children: "فردا"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: ["قیمت‌ها: ", PRICE_AS_OF]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto w-full max-w-xl px-4 pt-4 pb-nav",
				children: [
					tab === "home" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeView, { onOpenGoal: () => setTab("goal") }) : null,
					tab === "basket" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BasketView, {}) : null,
					tab === "goal" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoalView, {}) : null,
					tab === "report" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportView, {}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "nav-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface",
				"aria-label": "بخش‌های اصلی",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto grid w-full max-w-xl grid-cols-4",
					children: TABS.map((item) => {
						const Icon = item.icon;
						const active = tab === item.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "tab",
							"aria-selected": active,
							className: `flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-bold ${active ? "text-primary" : "text-muted"}`,
							onClick: () => setTab(item.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: "size-5",
								strokeWidth: active ? 2.25 : 1.75
							}), item.label]
						}, item.id);
					})
				})
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { Home as component };
