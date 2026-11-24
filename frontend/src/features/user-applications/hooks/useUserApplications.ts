import { useCallback, useEffect, useMemo, useState } from "react";
import type { Application } from "@/features/applications/applicationData";
import { useAuth } from "@/features/auth/useAuth";
import { subscribeToUserUpdates } from "@/lib/realtime";
import {
  applicantApplicationsApi,
  applicationStatusLabel,
  type ApplicantApplicationRecord,
} from "@/features/user-applications/backendApi";
import type { ApplicationFilter } from "@/components/ui/applications/ApplicationsMainSection";

function formatAppliedAt(value: string | null): string {
  if (!value) return "Date not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not available"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function toApplication(record: ApplicantApplicationRecord): Application {
  const company = record.listing?.company_name ?? "Company unavailable";
  const rejection = [...record.status_history]
    .reverse()
    .find((history) => history.status === "rejected");
  const interviewSchedule = record.interview?.scheduled_at
    ? (() => {
        const scheduled = new Date(record.interview.scheduled_at);
        if (Number.isNaN(scheduled.getTime())) return undefined;
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: record.interview.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(scheduled);
        const time = new Intl.DateTimeFormat("en-GB", {
          timeZone: record.interview.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(scheduled);
        return {
          date,
          time,
          timezone: record.interview.timezone,
          durationMinutes: record.interview.end_at
            ? Math.max(0, Math.round((new Date(record.interview.end_at).getTime() - scheduled.getTime()) / 60000))
            : undefined,
          mode: record.interview.mode,
          meetingUrl: record.interview.meeting_url,
          meetingInstructions: record.interview.meeting_instructions,
          location: record.interview.location,
        };
      })()
    : undefined;
  return {
    id: record.id,
    jobListingId: record.listing ? String(record.listing.id) : undefined,
    companyInitial: company.slice(0, 1).toUpperCase(),
    title: record.listing?.title ?? "Listing unavailable",
    company,
    appliedAt: formatAppliedAt(record.applied_at),
    status: applicationStatusLabel(record.status),
    track: record.listing?.listing_type === "ojt" ? "OJT" : "Job",
    rejectionReason: rejection?.public_reason ?? undefined,
    rejectedAt: record.rejected_at ?? rejection?.created_at ?? undefined,
    reapplyAvailableAt: record.reapply_available_at ?? undefined,
    reapplicationAllowed: record.reapplication_allowed,
    hiredAt: record.hired_at ?? undefined,
    employmentEndedAt: record.employment_ended_at,
    interviewSchedule,
    interviewId: record.interview?.id,
    interviewStatus: record.interview?.status,
    resumeFileName: record.resume?.original_filename,
    coverLetterFileName:
      record.cover_letter_document?.original_filename ??
      (record.cover_letter ? "Cover letter submitted" : undefined),
  };
}

export function useUserApplications() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<ApplicationFilter>("All applications");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (pageToLoad: number, append: boolean) => {
    if (!token) return;
    try {
      const response = await applicantApplicationsApi.list(token, pageToLoad);
      const records = response.data.map(toApplication);
      setError(null);
      setApplications((current) => append ? [...current, ...records] : records);
      setPage(response.meta.current_page);
      setLastPage(response.meta.last_page);
      setSelectedId((current) => current ?? records[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    if (!token) return;
    return subscribeToUserUpdates((update) => {
      if (update.resource === "applications") void loadPage(1, false);
    });
  }, [loadPage, token]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesFilter = filter === "All applications" || application.track === filter;
      const matchesQuery = !query ||
        `${application.title} ${application.company}`.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [applications, filter, search]);

  const activeSelectedId = filteredApplications.some((item) => item.id === selectedId)
    ? selectedId
    : filteredApplications[0]?.id ?? null;

  return {
    applications,
    filteredApplications,
    filter,
    search,
    selectedId: activeSelectedId,
    isLoading,
    error,
    hasMore: page < lastPage,
    loadMore: () => {
      setIsLoading(true);
      setError(null);
      void loadPage(page + 1, true);
    },
    onFilterChange: setFilter,
    onSearchChange: setSearch,
    onSelect: (id: number) => setSelectedId((current) => current === id ? null : id),
    retry: () => {
      setIsLoading(true);
      setError(null);
      void loadPage(1, false);
    },
    reload: () => {
      setIsLoading(true);
      setError(null);
      void loadPage(1, false);
    },
  };
}
