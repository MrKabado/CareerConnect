import { useMemo, useState } from "react";
import { applicantStatusConfig, applicantStatuses } from "@/features/employer-applicants/statuses";
import type { ApplicantStatus } from "@/features/employer-applicants/types";
import { useEmployerApplicants } from "@/features/employer-applicants/useEmployerApplicants";

export const jobTypeOptions = ["All applicants", "Job", "OJT"] as const;
export type JobTypeFilter = (typeof jobTypeOptions)[number];
export type ApplicantStatusFilter = "All statuses" | ApplicantStatus;

export function useApplicantPipeline() {
  const { applicants, isLoading, error } = useEmployerApplicants();
  const [jobTypeFilter, setJobTypeFilter] = useState<JobTypeFilter>("All applicants");
  const [statusFilter, setStatusFilter] = useState<ApplicantStatusFilter>("All statuses");
  const [search, setSearch] = useState("");

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
    error,
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
