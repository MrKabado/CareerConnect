import { apiRequest } from "@/lib/axios";

export type EmployerDashboardStats = {
  total_job_listings: number;
  active_job_listings: number;
  total_applications: number;
  pending_applications: number;
  upcoming_interviews?: number;
  closed_listings?: number;
  total_applicants?: number;
  hired_applicants?: number;
  recommendations?: Array<{
    id: string;
    title: string;
    message: string;
    priority: "high" | "medium" | "low";
    action: string;
  }>;
};

export const employerOverviewApi = {
  dashboard(token: string) {
    return apiRequest<{ data: EmployerDashboardStats }>("/employer/dashboard", {}, token);
  },

  company(token: string) {
    return apiRequest<{ company: { name: string } | null }>("/employer/company", {}, token);
  },
};
