import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { BackendApplicationStatus } from "@/features/employer-applicants/api";
import { applicantStatusConfig, applicantStatuses } from "@/features/employer-applicants/statuses";
import type { ApplicantStatus } from "@/features/employer-applicants/types";
import { useEmployerApplicants } from "@/features/employer-applicants/useEmployerApplicants";

export const jobTypeOptions = ["All applicants", "Job", "OJT"] as const;
export type JobTypeFilter = (typeof jobTypeOptions)[number];
export type ApplicantStatusFilter = "All statuses" | ApplicantStatus;

const backendStatusToApplicantStatus: Record<BackendApplicationStatus, ApplicantStatus> = {
  pending: "applied",
  reviewing: "under_review",
  shortlisted: "shortlisted",
  interview: "interview_scheduled",
  hired: "hired",
  rejected: "rejected",
};

const applicantStatusToBackendStatus: Record<ApplicantStatus, BackendApplicationStatus> = {
  applied: "pending",
  under_review: "reviewing",
  shortlisted: "shortlisted",
  interview_scheduled: "interview",
  hired: "hired",
  rejected: "rejected",
};

function isBackendApplicationStatus(value: string): value is BackendApplicationStatus {
  return Object.prototype.hasOwnProperty.call(backendStatusToApplicantStatus, value);
}

export function useApplicantPipeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const statusFilter: ApplicantStatusFilter = requestedStatus && isBackendApplicationStatus(requestedStatus)
    ? backendStatusToApplicantStatus[requestedStatus]
    : "All statuses";
  const { applicants, isLoading, isLoadingMore, error, total, hasMore, retry, loadMore } = useEmployerApplicants(
    statusFilter === "All statuses" ? undefined : applicantStatusToBackendStatus[statusFilter],
  );
  const [jobTypeFilter, setJobTypeFilter] = useState<JobTypeFilter>("All applicants");
  const [search, setSearch] = useState("");

  const setStatusFilter = useCallback((status: ApplicantStatusFilter) => {
    const nextParams = new URLSearchParams(searchParams);
    if (status === "All statuses") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", applicantStatusToBackendStatus[status]);
    }
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const visibleApplicants = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return applicants.filter((applicant) => {
      const matchesJobType = jobTypeFilter === "All applicants" || applicant.jobType === jobTypeFilter;
      const matchesStatus = statusFilter === "All statuses" || applicant.status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        [applicant.name, applicant.role, applicant.department, ...applicant.skills].some((value) =>
          value.toLowerCase().includes(searchTerm),
        );
      return matchesJobType && matchesStatus && matchesSearch;
    });
  }, [applicants, jobTypeFilter, search, statusFilter]);

  const countByStatus = (status: ApplicantStatus) =>
    applicants.filter((applicant) => applicant.status === status).length;

  return {
    applicants,
    isLoading,
    isLoadingMore,
    error,
    total,
    hasMore,
    retry,
    loadMore,
    jobTypeFilter,
    setJobTypeFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    visibleApplicants,
    countByStatus,
    applicantStatuses,
    applicantStatusConfig,
  };
}
