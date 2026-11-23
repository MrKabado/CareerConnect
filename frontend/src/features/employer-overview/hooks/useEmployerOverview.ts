import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import {
  employerOverviewApi,
  type EmployerDashboardStats,
} from "@/features/employer-overview/backendApi";

const emptyStats: EmployerDashboardStats = {
  total_job_listings: 0,
  active_job_listings: 0,
  total_applications: 0,
  pending_applications: 0,
  shortlisted_applications: 0,
  upcoming_interviews: 0,
  recommendations: [],
  closed_listings: 0,
  total_applicants: 0,
  hired_applicants: 0,
  application_status_counts: {
    pending: 0,
    reviewing: 0,
    shortlisted: 0,
    interview: 0,
    hired: 0,
    rejected: 0,
  },
  recent_applications: [],
  upcoming_interview_records: [],
};

const applicationStatuses = [
  { status: "pending", label: "Pending", color: "#1e9fe5" },
  { status: "reviewing", label: "Reviewing", color: "#3577d4" },
  { status: "shortlisted", label: "Shortlisted", color: "#1d9d75" },
  { status: "interview", label: "Interview", color: "#7a5ec8" },
  { status: "hired", label: "Hired", color: "#187850" },
  { status: "rejected", label: "Rejected", color: "#b85054" },
] as const;

export function useEmployerOverview() {
  const { token } = useAuth();
  const [stats, setStats] = useState(emptyStats);
  const [companyName, setCompanyName] = useState("Company profile");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [dashboard, company] = await Promise.all([
        employerOverviewApi.dashboard(token),
        employerOverviewApi.company(token),
      ]);
      setStats(dashboard.data);
      setCompanyName(company.company?.name || "Company profile");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load employer dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // The request updates state only after its promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const handleListingChanged = () => void load();
    window.addEventListener("careerconnect:employer-listings-changed", handleListingChanged);
    window.addEventListener("focus", handleListingChanged);
    return () => {
      window.removeEventListener("careerconnect:employer-listings-changed", handleListingChanged);
      window.removeEventListener("focus", handleListingChanged);
    };
  }, [load]);

  return {
    stats,
    companyName,
    isLoading,
    error,
    retry: () => {
      setIsLoading(true);
      setError(null);
      void load();
    },
    pipeline: applicationStatuses.map(({ status, label, color }) => ({
      status,
      label,
      count: stats.application_status_counts[status],
      color,
    })),
    maximumPipelineCount: Math.max(stats.total_applications, 1),
  };
}
