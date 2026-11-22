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
  upcoming_interviews: 0,
  recommendations: [],
  closed_listings: 0,
  total_applicants: 0,
  hired_applicants: 0,
};

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
    pipeline: [
      { label: "Pending applications", count: stats.pending_applications, color: "#1e9fe5" },
      { label: "Other application statuses", count: Math.max(0, stats.total_applications - stats.pending_applications), color: "#39b3ab" },
    ],
    maximumPipelineCount: Math.max(stats.total_applications, 1),
  };
}
