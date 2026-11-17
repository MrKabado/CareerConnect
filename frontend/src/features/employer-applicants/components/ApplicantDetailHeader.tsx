import EmployerOpportunityTypeBadge from "@/components/common/employer/EmployerOpportunityTypeBadge";
import ApplicantStatusIcon from "@/features/employer-applicants/components/ApplicantStatusIcon";
import { applicantStatusConfig } from "@/features/employer-applicants/statuses";
import type { ApplicantStatus } from "@/features/employer-applicants/types";

export function ApplicantStatusPill({ status }: { status: ApplicantStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${applicantStatusConfig[status].badgeClass}`}
    >
      <ApplicantStatusIcon name={applicantStatusConfig[status].icon} className="mr-1 size-3.5" />
      {applicantStatusConfig[status].label}
    </span>
  );
}

export function ApplicantDetailHeader({
  applicant,
  status,
}: {
  applicant: {
    name: string;
    initials: string;
    jobType: "Job" | "OJT";
    role: string;
    department: string;
    location: string;
    appliedDate: string;
    status: ApplicantStatus;
  };
  status: ApplicantStatus;
}) {
  return (
    <header className="mt-5 flex flex-wrap items-start justify-between gap-5 border-b border-[#e1ebea] pb-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[#dfeef0] text-sm font-bold text-[#2a5361]">
          {applicant.initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#203638]">{applicant.name}</h1>
            <EmployerOpportunityTypeBadge>{applicant.jobType}</EmployerOpportunityTypeBadge>
          </div>
          <p className="mt-1 text-sm text-[#667b7c]">
            {applicant.role} · {applicant.department}
          </p>
          <p className="mt-1 text-xs text-[#7b8d8d]">
            {applicant.location} · Applied {applicant.appliedDate}
          </p>
        </div>
      </div>
      <ApplicantStatusPill status={status ?? applicant.status} />
    </header>
  );
}
