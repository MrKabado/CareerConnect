import { Link } from "react-router";
import EmployerOpportunityTypeBadge from "@/components/common/employer/EmployerOpportunityTypeBadge";
import { hiringSetup, jobRows } from "@/features/employer-overview/constants";

export default function HiringSetupCard() {
  return (
    <article className="rounded-[16px] border border-[#edf1f1] bg-white p-5 shadow-[0_8px_24px_rgba(34,66,65,0.05)] max-[680px]:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-[#344749]">Hiring setup</h2>
          <p className="mt-1 text-[10px] text-[#849293]">
            A snapshot of your roles and hiring tracks
          </p>
        </div>
        <Link
          className="text-[10px] font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
          to="/employer/listings"
        >
          Manage listings
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {hiringSetup.map(({ title, subtitle, count }) => (
          <article className="rounded-xl border border-[#edf1f1] bg-[#f8fbfb] p-3.5" key={title}>
            <div className="flex items-center justify-between gap-2">
              {title === "Jobs" ? (
                <p className="text-[10px] font-semibold text-[#526365]">{title}</p>
              ) : (
                <EmployerOpportunityTypeBadge>{title}</EmployerOpportunityTypeBadge>
              )}
              <span className="rounded-full bg-[#e3f5f2] px-2 py-0.5 text-[8px] font-semibold text-[#188783]">
                {count} roles
              </span>
            </div>
            <p className="mt-2 text-[9px] text-[#849293]">{subtitle}</p>
            <p className="mt-1 text-[10px] font-semibold text-[#344749]">{count} roles</p>
          </article>
        ))}
      </div>

      <div className="mt-4 divide-y divide-[#edf1f1]">
        {jobRows.map(({ title, type, location, applicants, status, tone }) => (
          <div
            className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_100px_90px_72px] sm:items-center"
            key={title}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[10px] font-semibold text-[#344749]">{title}</p>
                <EmployerOpportunityTypeBadge>{type}</EmployerOpportunityTypeBadge>
              </div>
              <p className="mt-1 text-[9px] text-[#849293]">{location}</p>
            </div>
            <span className="text-[9px] text-[#687b7e]">{applicants} applicants</span>
            <span className={`w-fit rounded-full px-2 py-1 text-[8px] font-semibold ${tone}`}>
              {status}
            </span>
            <Link
              className="text-[9px] font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
              to="/employer/listings"
            >
              Review
            </Link>
          </div>
        ))}
      </div>
    </article>
  );
}
