import type { ReactNode } from "react";
import type {
  Application,
  ApplicationStatus,
} from "@/features/applications/applicationData";

export type {
  Application,
  ApplicationStatus,
  ApplicationTrack,
} from "@/features/applications/applicationData";

const statusStyles: Record<ApplicationStatus, string> = {
  Applied: "bg-[#eaf1ff] text-[#5276bd]",
  "Under Review": "bg-[#fff3df] text-[#a9792a]",
  Shortlisted: "bg-[#f1eaff] text-[#8054bd]",
  "Interview Scheduled": "bg-[#e3f7f2] text-[#238b7a]",
  Hired: "bg-[#dcf6ec] text-[#298263]",
  Rejected: "bg-[#fde9e8] text-[#c56764]",
};

export function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-[#edf1f1] bg-white shadow-[0_5px_18px_rgba(32,67,65,0.05)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-9 w-56 items-center gap-2 rounded-lg border border-[#e6eded] bg-white px-3 text-[#9aa7a7] max-[600px]:w-full">
      <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
        <circle
          cx="8.8"
          cy="8.8"
          r="5.8"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m13.2 13.2 4 4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
      <input
        aria-label="Search role or company"
        className="w-full bg-transparent text-[10px] text-[#354346] outline-none placeholder:text-[#9aa7a7]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search role or company"
        value={value}
      />
    </label>
  );
}

export function StatCard({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#edf1f1] bg-white px-4 py-3 shadow-[0_5px_15px_rgba(32,67,65,0.04)]">
      <p className={`text-[22px] leading-none font-bold ${accent}`}>{value}</p>
      <p className="mt-2 truncate text-[11px] text-[#8a999a]">{label}</p>
    </article>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md px-2 py-1 text-[9px] leading-none font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 text-[9px] font-semibold transition ${
        active
          ? "bg-[#078b8d] text-white shadow-sm"
          : "text-[#708384] hover:text-[#087879]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ApplicationRow({
  application,
  selected,
  onSelect,
}: {
  application: Application;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`grid w-full grid-cols-[minmax(0,1.45fr)_minmax(100px,0.4fr)_minmax(130px,0.55fr)_16px] items-center gap-3 border-b border-[#edf1f1] px-3 py-3 text-left transition last:border-b-0 hover:bg-[#f8fbfb] max-[620px]:grid-cols-[minmax(0,1fr)_16px] ${
        selected ? "bg-[#f4faf9]" : "bg-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e6f6f3] text-[10px] font-bold text-[#178b87]">
          {application.companyInitial}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[11px] font-semibold text-[#354346]">
              {application.title}
            </span>
            {application.track === "OJT" && (
              <span className="shrink-0 rounded bg-[#fff0dc] px-1.5 py-0.5 text-[8px] font-semibold text-[#bd852d]">
                OJT
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-[9px] text-[#879596]">
            {application.company}
          </span>
        </span>
      </span>
      <span className="min-w-0 text-[9px] text-[#879596] max-[620px]:hidden">
        {application.appliedAt}
      </span>
      <span className="min-w-0 max-[620px]:hidden">
        <StatusBadge status={application.status} />
      </span>
      <span className="text-center text-[#aab6b6]" aria-hidden="true">
        ›
      </span>
      <span className="col-span-2 mt-1 flex items-center justify-between pl-10 min-[621px]:hidden">
        <span className="text-[9px] text-[#879596]">{application.appliedAt}</span>
        <StatusBadge status={application.status} />
      </span>
    </button>
  );
}

export function ApplicationTable({
  applications,
  selectedId,
  onSelect,
}: {
  applications: Application[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <Surface className="mt-3">
      <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(100px,0.4fr)_minmax(130px,0.55fr)_16px] gap-3 border-b border-[#edf1f1] bg-[#fbfcfc] px-3 py-2.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-[#98a5a5] max-[620px]:grid-cols-[minmax(0,1fr)_16px]">
        <span>Opportunity</span>
        <span className="max-[620px]:hidden">Applied</span>
        <span className="max-[620px]:hidden">Status</span>
        <span />
      </div>
      {applications.length > 0 ? (
        applications.map((application) => (
          <ApplicationRow
            application={application}
            key={application.id}
            onSelect={() => onSelect(application.id)}
            selected={selectedId === application.id}
          />
        ))
      ) : (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[#526365]">
            No applications found
          </p>
          <p className="mt-1 text-xs text-[#879596]">
            Try another search or application type.
          </p>
        </div>
      )}
    </Surface>
  );
}
