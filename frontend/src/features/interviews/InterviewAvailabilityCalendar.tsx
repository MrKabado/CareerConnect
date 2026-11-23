import { useState } from "react";

function formatLocalDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayInTimezone(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    const today = new Date();
    return formatLocalDate(today.getFullYear(), today.getMonth(), today.getDate());
  }
}

export default function InterviewAvailabilityCalendar({
  selectedDates,
  availableDates,
  timezone,
  restrictToAvailable = false,
  onSelectDate,
}: {
  selectedDates: string[];
  availableDates?: string[];
  timezone: string;
  restrictToAvailable?: boolean;
  onSelectDate: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const today = todayInTimezone(timezone);
  const allowedDates = new Set(availableDates ?? []);
  const cells = [
    ...Array.from({ length: firstDay }, (_, index) => `empty-${index}`),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function moveMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <div className="rounded-xl border border-[#e4edeb] bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          aria-label="Previous month"
          className="grid size-8 place-items-center rounded-lg border border-[#e1ebea] text-sm text-[#496264] hover:bg-[#f1f8f7]"
          onClick={() => moveMonth(-1)}
          type="button"
        >
          ‹
        </button>
        <h3 aria-live="polite" className="text-sm font-semibold text-[#31494b]">
          {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month)}
        </h3>
        <button
          aria-label="Next month"
          className="grid size-8 place-items-center rounded-lg border border-[#e1ebea] text-sm text-[#496264] hover:bg-[#f1f8f7]"
          onClick={() => moveMonth(1)}
          type="button"
        >
          ›
        </button>
      </div>
      <div aria-label="Calendar" className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((weekday) => (
          <span className="py-1 text-center text-[10px] font-medium text-[#879697]" key={weekday}>
            {weekday}
          </span>
        ))}
        {cells.map((cell) => {
          if (typeof cell === "string") {
            return <span aria-hidden="true" className="aspect-square" key={cell} />;
          }

          const date = formatLocalDate(year, monthIndex, cell);
          const selected = selectedDates.includes(date);
          const available = allowedDates.has(date);
          const unavailableByRule = date < today || (restrictToAvailable && !available);

          return (
            <button
              aria-label={new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${date}T00:00:00Z`))}
              aria-pressed={selected}
              className={`aspect-square rounded-lg text-xs font-medium transition-colors focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] ${
                selected
                  ? "bg-[#0e8e9b] text-white"
                  : available
                    ? "bg-[#e6f6f2] text-[#167d72] hover:bg-[#d2eee8]"
                    : unavailableByRule
                      ? "cursor-not-allowed text-[#c2cccc]"
                      : "text-[#52696b] hover:bg-[#f1f8f7]"
              }`}
              disabled={unavailableByRule}
              key={date}
              onClick={() => onSelectDate(date)}
              type="button"
            >
              {cell}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#718586]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#0e8e9b]" /> Selected
        </span>
        {restrictToAvailable && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[#e6f6f2]" /> Slots available
          </span>
        )}
      </div>
    </div>
  );
}
