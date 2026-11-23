import type { EmployerDashboardStats } from "@/features/employer-overview/backendApi";
import { Link } from "react-router";

type OverviewStatsSectionProps = {
  stats: EmployerDashboardStats;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

type NumericEmployerStat =
  | "total_job_listings"
  | "active_job_listings"
  | "total_applications"
  | "pending_applications"
  | "shortlisted_applications"
  | "closed_listings"
  | "hired_applicants"
  | "upcoming_interviews";

const cards: Array<{ key: NumericEmployerStat; label: string; accent: string; to?: string }> = [
  { key: "total_job_listings", label: "Total listings", accent: "text-[#354346]" },
  { key: "active_job_listings", label: "Active listings", accent: "text-[#168b87]" },
  { key: "total_applications", label: "Total applications", accent: "text-[#354346]", to: "/employer/applicants" },
  { key: "pending_applications", label: "Pending review", accent: "text-[#31a581]", to: "/employer/applicants?status=pending" },
  { key: "shortlisted_applications", label: "Shortlisted", accent: "text-[#1d9d75]", to: "/employer/applicants?status=shortlisted" },
  { key: "upcoming_interviews", label: "Scheduled interviews", accent: "text-[#765cb8]", to: "/employer/applicants?status=interview" },
  { key: "hired_applicants", label: "Hired applicants", accent: "text-[#31a581]", to: "/employer/applicants?status=hired" },
  { key: "closed_listings", label: "Closed listings", accent: "text-[#687b7e]" },
];

function StatCard({
  label,
  value,
  accent,
  to,
}: {
  label: string;
  value: string;
  accent: string;
  to?: string;
}) {
  const content = (
    <>
      <p className={`text-[22px] leading-none font-bold ${accent}`}>{value}</p>
      <p className="mt-2 text-[10px] font-medium text-[#829091]">{label}</p>
    </>
  );
  const className = "block rounded-[16px] border border-[#edf1f1] bg-white p-4 shadow-[0_8px_24px_rgba(34,66,65,0.05)]";

  return to ? (
    <Link className={`${className} transition hover:border-[#b8dedd] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]`} to={to}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export default function OverviewStatsSection({
  stats,
  isLoading,
  error,
  onRetry,
}: OverviewStatsSectionProps) {
  return (
    <section aria-label="Employer statistics" aria-busy={isLoading} className="mt-5">
      {error && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          <span>{error}</span>
          <button className="font-semibold underline" onClick={onRetry} type="button">Try again</button>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3 max-[620px]:grid-cols-2">
        {cards.map(({ key, label, accent, to }) => (
          <StatCard
            accent={accent}
            key={key}
            label={label}
            to={to}
            value={isLoading ? "—" : (stats[key] ?? 0).toLocaleString()}
          />
        ))}
      </div>
    </section>
  );
}
