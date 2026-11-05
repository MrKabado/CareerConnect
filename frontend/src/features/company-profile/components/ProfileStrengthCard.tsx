import type { ProfileStrengthResult } from "@/features/company-profile/types";
import { cn } from "@/lib/cn";

export default function ProfileStrengthCard({
  strength,
}: {
  strength: ProfileStrengthResult;
}) {
  const isComplete = strength.percent === 100;

  return (
    <section
      aria-label="Company profile strength"
      aria-live="polite"
      className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(27,54,52,0.03)] md:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold text-[#1d3034]">Profile strength</h2>
        <span className="text-[12px] font-bold text-[#1d3034]">{strength.percent}%</span>
      </div>

      <div
        aria-label={`Profile strength ${strength.percent}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={strength.percent}
        className="h-2.5 overflow-hidden rounded-full bg-[#edf2f1]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[#0d8fa2] transition-[width]"
          style={{ width: `${strength.percent}%` }}
        />
      </div>

      <ul className="mt-4 space-y-3 text-[11px] text-[#516d70]">
        {strength.items.map((item) => (
          <li className="flex items-start gap-2" key={item.id}>
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] font-bold",
                item.complete
                  ? "bg-[#dff4ef] text-[#1b8d87]"
                  : "border border-[#cbd9d8] text-transparent",
              )}
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className={item.complete ? "" : "text-[#445d60]"}>{item.label}</span>
              {!item.complete ? (
                <span className="mt-1 block text-[10px] leading-4 text-[#849394]">
                  {item.hint}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {isComplete ? (
        <p className="mt-4 text-center text-[11px] font-semibold text-[#208267]">
          Profile complete
        </p>
      ) : null}
    </section>
  );
}
