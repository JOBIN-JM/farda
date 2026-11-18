import { isTime } from "@/lib/farda/reminder";
import { usePlan } from "@/lib/farda/store";
import { Card } from "./ui";

export function ReminderSettings() {
  const reminder = usePlan((s) => s.reminder);
  const setReminder = usePlan((s) => s.setReminder);

  return (
    <Card>
      <button
        type="button"
        role="switch"
        aria-checked={reminder.enabled}
        onClick={() => setReminder({ enabled: !reminder.enabled })}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-start"
      >
        <span className="text-base font-bold">یادآوری خرج روزانه</span>
        <span
          aria-hidden="true"
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
            reminder.enabled ? "bg-primary" : "bg-line"
          }`}
        >
          <span
            className={`size-6 rounded-full bg-surface shadow transition-transform ${
              reminder.enabled ? "-translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
      <p className="mt-2 text-xs leading-5 text-muted">
        هر روز بعد از ساعت یادآوری، وقتی اپ را باز کنی می‌پرسد چقدر خرج کردی. اپ بسته نوتیف نمی‌فرستد.
      </p>
      {reminder.enabled ? (
        <label className="mt-3 flex min-h-11 items-center justify-between gap-3 text-sm">
          <span className="text-muted">ساعت یادآوری</span>
          <input
            type="time"
            value={reminder.time}
            onChange={(event) => {
              if (isTime(event.target.value)) setReminder({ time: event.target.value });
            }}
            className="min-h-11 rounded-xl border border-line bg-surface px-3 text-base tabular-nums text-ink outline-none focus:border-primary"
          />
        </label>
      ) : null}
    </Card>
  );
}
