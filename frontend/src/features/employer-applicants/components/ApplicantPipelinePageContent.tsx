import { Link } from "react-router";
import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import EmployerOpportunityTypeBadge from "@/components/common/employer/EmployerOpportunityTypeBadge";
import ApplicantPipelineSkeleton from "@/features/employer-applicants/components/ApplicantPipelineSkeleton";
import ApplicantStatusIcon from "@/features/employer-applicants/components/ApplicantStatusIcon";
import { applicantStatusConfig } from "@/features/employer-applicants/statuses";
import type { Applicant, ApplicantStatus } from "@/features/employer-applicants/types";
import { jobTypeOptions, useApplicantPipeline } from "@/features/employer-applicants/hooks/useApplicantPipeline";

function StatusPill({ status }: { status: ApplicantStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest ${applicantStatusConfig[status].badgeClass}`}>
      <ApplicantStatusIcon name={applicantStatusConfig[status].icon} className="mr-1 size-3" />
      {applicantStatusConfig[status].label}
    </span>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[#e5eeeb] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(20,47,47,0.02)]">
      <span className={`grid size-9 place-items-center rounded-lg ${tone}`}><span className="size-2 rounded-full bg-current" /></span>
      <div>
        <p className="text-xs text-[#647778]">{label}</p>
        <p className="mt-0.5 text-lg font-semibold text-[#203638]">{value}</p>
      </div>
    </div>
  );
}

function ApplicantRow({ applicant }: { applicant: Applicant }) {
  return (
    <article className="flex flex-col gap-4 border-b border-[#edf3f2] bg-white px-4 py-4 transition hover:bg-[#f8fbfa] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#dfeef0] text-[10px] font-bold text-[#2a5361]">{applicant.initials}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#1d3034]">{applicant.name}</h3>
            <EmployerOpportunityTypeBadge>{applicant.jobType}</EmployerOpportunityTypeBadge>
          </div>
          <p className="mt-1 text-xs text-[#5f7173]">{applicant.role} · {applicant.department}</p>
          <p className="mt-1 text-[11px] text-[#7d8a8b]">{applicant.location} · Applied {applicant.appliedDate}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <span className="text-xs text-[#64797b]">{applicant.match}% match</span>
        <StatusPill status={applicant.status} />
        <Link to={`/employer/applicants/${applicant.id}`} className="inline-flex items-center justify-center rounded-lg border border-[#d8e8e6] bg-white px-3 py-2 text-xs font-semibold text-[#0c808d] hover:bg-[#f3fbfc]">Review applicant</Link>
      </div>
    </article>
  );
}

export default function ApplicantPipelinePageContent() {
  const { applicants, isLoading, error, jobTypeFilter, setJobTypeFilter, statusFilter, setStatusFilter, search, setSearch, visibleApplicants, countByStatus, applicantStatuses } = useApplicantPipeline();

  if (isLoading) {
    return (
      <EmployerWorkspaceLayout>
        <ApplicantPipelineSkeleton />
      </EmployerWorkspaceLayout>
    );
  }

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto w-full max-w-284 flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:py-5">
        <header className="relative isolate mb-5 flex flex-col gap-3 py-5 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-[#deeeeb] before:bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[9px] font-semibold text-[#188783]">Maya Philippines</p>
            <h1 className="mt-2 text-[25px] font-bold leading-tight text-[#263638] max-[600px]:text-[22px]">Applicants</h1>
            <p className="mt-1 text-[11px] text-[#849293]">Review applicant profiles, submitted documents, and hiring progress.</p>
          </div>
          <span className="text-xs font-medium text-[#587174]">{applicants.length} applicants</span>
        </header>
        <section aria-label="Applicant stage summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[{ label: "Awaiting review", value: countByStatus("applied"), tone: "bg-[#eef5ff] text-[#3577d4]" }, { label: "Under review", value: countByStatus("under_review"), tone: "bg-[#edf5ff] text-[#356bcc]" }, { label: "Shortlisted", value: countByStatus("shortlisted"), tone: "bg-[#edf8f2] text-[#1d9d75]" }, { label: "Interview scheduled", value: countByStatus("interview_scheduled"), tone: "bg-[#f8f0ff] text-[#7a5ec8]" }].map(({ label, value, tone }) => <SummaryCard key={label} label={label} value={value} tone={tone} />)}
        </section>
        <section className="mt-6 overflow-hidden rounded-[22px] border border-[#e5eeeb] bg-white shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
          <div className="flex flex-col gap-3 rounded-t-[22px] border-b border-[#e7efee] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1d3034]">Candidate pipeline</h2>
              <p className="mt-1 text-xs text-[#738385]" aria-live="polite">{`${visibleApplicants.length} applicants shown`}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="sr-only" htmlFor="applicant-search">Search applicants</label>
              <input id="applicant-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, role, or skill" className="min-w-0 rounded-lg border border-[#dfe9e7] bg-[#fbfdfd] px-3 py-2 text-sm text-[#243a3c] outline-none focus:border-[#9acdcc] sm:w-64" />
              <label className="sr-only" htmlFor="applicant-stage-filter">Filter by stage</label>
              <select id="applicant-stage-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-lg border border-[#dfe9e7] bg-white px-3 py-2 text-sm text-[#40595b] outline-none focus:border-[#9acdcc]">
                <option>All statuses</option>
                {applicantStatuses.map((status) => <option key={status} value={status}>{applicantStatusConfig[status].label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 border-b border-[#e7efee] px-4 py-3">{jobTypeOptions.map((option) => <button key={option} type="button" onClick={() => setJobTypeFilter(option)} aria-pressed={jobTypeFilter === option} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${jobTypeFilter === option ? "bg-[#0e8e9b] text-white" : "text-[#587174] hover:bg-[#f1f8f7]"}`}>{option}</button>)}</div>
          {error ? <p className="px-4 py-4 text-sm text-[#b85054]" role="alert">{error}</p> : null}
          {!error && visibleApplicants.length === 0 ? <p className="px-4 py-10 text-center text-sm text-[#718586]">No applicants match these filters.</p> : null}
          <div className="divide-y divide-[#e7efee] rounded-b-[22px]">{visibleApplicants.map((applicant) => <ApplicantRow key={applicant.id} applicant={applicant} />)}</div>
        </section>
      </main>
    </EmployerWorkspaceLayout>
  );
}

