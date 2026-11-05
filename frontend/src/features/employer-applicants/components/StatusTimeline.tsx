import { applicantStatusConfig } from "@/features/employer-applicants/statuses";
import type { ApplicantStatusHistoryEntry } from "@/features/employer-applicants/types";

type StatusTimelineProps = {
  history: ApplicantStatusHistoryEntry[];
};

function formatChangedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function StatusTimeline({ history }: StatusTimelineProps) {
  return (
    <section aria-labelledby="activity-heading" className="border-t border-[#e7efee] pt-4">
      <h3 id="activity-heading" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#647778]">Stage activity</h3>
      {history.length ? (
        <ol className="mt-3 space-y-3" aria-live="polite">
          {history.map((entry, index) => (
            <li key={`${entry.changedAt}-${entry.to}-${index}`} className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1a9697]" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium text-[#31494b]">
                  {applicantStatusConfig[entry.to].label} · {formatChangedAt(entry.changedAt)} by {entry.changedBy}
                </p>
                {entry.note ? <p className="mt-1 text-xs leading-5 text-[#718586]">{entry.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-[#718586]">No stage changes recorded yet.</p>
      )}
    </section>
  );
}