import type { ReactNode } from "react";
import { Link } from "react-router";
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

const applicationStages: ApplicationStatus[] = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Hired",
];

const statusGuidance: Record<ApplicationStatus, string> = {
  Applied: "Your application is submitted. The employer has not shared an update yet.",
  "Under Review": "The employer is reviewing your application and qualifications.",
  Shortlisted: "You have been shortlisted. Watch for a message about the next step.",
  "Interview Scheduled": "Prepare for your interview. Check your email for the interview time and instructions.",
  Hired: "You have been selected. Contact the employer for onboarding details.",
  Rejected: "This application was not moved forward. You can continue exploring other opportunities.",
};

export function ApplicationDetailPanel({
  application,
  onClose,
}: {
  application: Application;
  onClose: () => void;
}) {
  const stages =
    application.status === "Rejected"
      ? (["Applied", "Under Review", "Rejected"] as ApplicationStatus[])
      : applicationStages;
  const currentStageIndex = stages.indexOf(application.status);

  return (
    <aside
      aria-label={`${application.title} application details`}
      className="overflow-hidden rounded-[16px] border border-[#e8eeee] bg-white shadow-[0_5px_18px_rgba(32,67,65,0.06)]"
    >
      <header className="border-b border-[#e7eeee] bg-[linear-gradient(120deg,#f0faf8,#e7f7f3)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-[#e1f4f1] px-2 py-1 text-[8px] font-semibold text-[#16827e]">
              {application.track}
            </span>
            <StatusBadge status={application.status} />
          </div>
          <button
            aria-label="Close application details"
            className="text-[9px] font-semibold text-[#16878b] hover:text-[#086f73] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <h2 className="mt-3 text-[15px] font-bold text-[#2b3e3f]">
          {application.title}
        </h2>
        <p className="mt-1 text-[10px] text-[#647779]">{application.company}</p>
        <p className="mt-1 text-[9px] text-[#8a999a]">
          Applied {application.appliedAt}
        </p>
      </header>

      <div className="space-y-4 p-4">
        <section className="rounded-[10px] bg-[#f0faf8] p-3">
          <h3 className="text-[8px] font-bold uppercase tracking-[0.04em] text-[#16827e]">
            Next step
          </h3>
          <p className="mt-1.5 text-[10px] font-semibold text-[#354749]">
            {application.status === "Interview Scheduled"
              ? "Prepare for your interview"
              : application.status === "Hired"
                ? "Prepare for onboarding"
                : application.status === "Rejected"
                  ? "Explore other opportunities"
                  : "Wait for an employer update"}
          </p>
          <p className="mt-1 text-[9px] leading-[1.55] text-[#718184]">
            {statusGuidance[application.status]}
          </p>
        </section>

        <section aria-labelledby="application-progress-heading">
          <h3
            className="text-[8px] font-bold uppercase tracking-[0.04em] text-[#8a999a]"
            id="application-progress-heading"
          >
            Application progress
          </h3>
          <ol className="mt-3 space-y-0">
            {stages.map((stage, index) => {
              const isComplete = index < currentStageIndex;
              const isCurrent = stage === application.status;
              return (
                <li className="relative flex min-h-8 gap-2.5" key={stage}>
                  {index < stages.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-[17px] left-[7px] h-full w-px ${isComplete ? "bg-[#078b8d]" : "bg-[#e2ebea]"}`}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative z-10 mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[8px] ${
                      isComplete || isCurrent
                        ? "border-[#078b8d] bg-[#078b8d] text-white"
                        : "border-[#dce7e6] bg-[#f3f7f6] text-[#a2b0b0]"
                    }`}
                  >
                    {isComplete ? "✓" : isCurrent ? "•" : ""}
                  </span>
                  <span
                    className={`pb-3 text-[9px] ${isCurrent ? "font-semibold text-[#354749]" : isComplete ? "text-[#647779]" : "text-[#9aa6a7]"}`}
                  >
                    {stage}
                    {stage === "Applied" && (
                      <span className="ml-1.5 text-[8px] text-[#9aa6a7]">
                        {application.appliedAt}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {(application.resumeFileName || application.applicationLetterFileName) && (
          <section className="border-t border-[#edf1f1] pt-3">
            <h3 className="text-[8px] font-bold uppercase tracking-[0.04em] text-[#8a999a]">
              Submitted documents
            </h3>
            <ul className="mt-2 space-y-1 text-[9px] text-[#647779]">
              {application.resumeFileName && (
                <li>Resume: {application.resumeFileName}</li>
              )}
              {application.applicationLetterFileName && (
                <li>Application letter: {application.applicationLetterFileName}</li>
              )}
            </ul>
          </section>
        )}

        {application.jobListingId && (
          <Link
            className="flex min-h-9 items-center justify-center rounded-[9px] border border-[#e2eaea] px-3 text-[9px] font-semibold text-[#526365] hover:bg-[#f7faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
            to={`/apply/${application.jobListingId}`}
          >
            View submitted application
          </Link>
        )}
      </div>
    </aside>
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
