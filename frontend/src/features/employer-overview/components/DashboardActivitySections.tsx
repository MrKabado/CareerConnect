import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { EmployerDashboardStats } from "@/features/employer-overview/backendApi";

type Props = {
  stats: EmployerDashboardStats;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

function ApplicantAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();

  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#dfeef0] text-xs font-bold text-[#2a5361]">
      {photoUrl && !imageFailed ? (
        <img alt="" className="absolute inset-0 size-full object-cover" onError={() => setImageFailed(true)} src={photoUrl} />
      ) : initials || "A"}
    </span>
  );
}

function relativeDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Date unavailable";

  const difference = (timestamp - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const matchedUnit = units.find(([, seconds]) => Math.abs(difference) >= seconds);
  const unit: Intl.RelativeTimeFormatUnit = matchedUnit?.[0] ?? "second";
  const secondsPerUnit = matchedUnit?.[1] ?? 1;

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" })
    .format(Math.round(difference / secondsPerUnit), unit);
}

function interviewDateTime(scheduledAt: string | null, timezone: string): string {
  if (!scheduledAt) return "Schedule unavailable";
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return "Schedule unavailable";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function modeLabel(mode: "onsite" | "online" | "phone"): string {
  return mode === "onsite" ? "On-site" : mode === "online" ? "Online" : "Phone";
}

function ActivityCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[16px] border border-[#edf1f1] bg-white shadow-[0_8px_24px_rgba(34,66,65,0.05)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#edf1f1] px-4 py-3">
        <h2 className="text-[13px] font-bold text-[#344749]">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export default function DashboardActivitySections({ stats, isLoading, error, onRetry }: Props) {
  const noDataState = (message: string) => (
    <p className="px-4 py-8 text-center text-xs text-[#738385]">{message}</p>
  );
  const showUpcomingInterviews = isLoading || error !== null || stats.upcoming_interview_records.length > 0;

  const loadingState = noDataState("Loading dashboard activity…");
  const errorState = (
    <div className="px-4 py-6 text-center" role="alert">
      <p className="text-xs text-[#738385]">Dashboard activity is temporarily unavailable.</p>
      <button className="mt-2 text-xs font-semibold text-[#078b8d] underline" onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  );

  return (
    <div className={`mt-4 grid items-start gap-3 ${showUpcomingInterviews ? "lg:grid-cols-2" : ""}`}>
      <ActivityCard title="Recent applications">
        {isLoading ? loadingState : error ? errorState : stats.recent_applications.length === 0 ? (
          noDataState("Applications will appear here when candidates apply to your listings.")
        ) : (
          <div className="divide-y divide-[#edf3f2]">
            {stats.recent_applications.map((application) => (
              <Link
                className="flex min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-[#f8fbfa] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                key={application.id}
                to={`/employer/applicants/application-${application.id}`}
              >
                <ApplicantAvatar name={application.applicant.name} photoUrl={application.applicant.photo_url} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[11px] font-semibold text-[#263638]">{application.applicant.name}</span>
                    <span className="rounded-full bg-[#edf8f7] px-2 py-0.5 text-[9px] font-medium capitalize text-[#177d83]">
                      {application.status.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-[#687b7e]">{application.listing.title}</span>
                  <span className="mt-0.5 block text-[9px] text-[#849293]">{relativeDate(application.applied_at)}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-sm text-[#078b8d]">›</span>
              </Link>
            ))}
          </div>
        )}
        <footer className="border-t border-[#edf1f1] px-4 py-2.5">
          <Link className="text-[10px] font-semibold text-[#078b8d] hover:underline" to="/employer/applicants">
            View all applications
          </Link>
        </footer>
      </ActivityCard>

      {showUpcomingInterviews ? (
        <ActivityCard title="Upcoming interviews">
          {isLoading ? loadingState : error ? errorState : (
            <>
              <div className="divide-y divide-[#edf3f2]">
                {stats.upcoming_interview_records.map((interview) => (
                  <Link
                    className="flex min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-[#f8fbfa] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                    key={interview.id}
                    to={`/employer/applicants/application-${interview.application_id}`}
                  >
                    <ApplicantAvatar name={interview.applicant.name} photoUrl={interview.applicant.photo_url} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-[#263638]">{interview.applicant.name}</span>
                      <span className="mt-1 block truncate text-[10px] text-[#687b7e]">{interview.listing.title}</span>
                      <span className="mt-0.5 block text-[9px] text-[#849293]">
                        {interviewDateTime(interview.scheduled_at, interview.timezone)} · {modeLabel(interview.mode)}
                        {interview.mode === "onsite" && interview.location ? ` · ${interview.location}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#f8f0ff] px-2 py-1 text-[9px] font-medium text-[#7a5ec8]">
                      Scheduled
                    </span>
                  </Link>
                ))}
              </div>
              <footer className="border-t border-[#edf1f1] px-4 py-2.5">
                <Link className="text-[10px] font-semibold text-[#078b8d] hover:underline" to="/employer/applicants?status=interview">
                  View interview schedule
                </Link>
              </footer>
            </>
          )}
        </ActivityCard>
      ) : null}
    </div>
  );
}
