import { apiRequest } from "@/lib/axios";

export type EmployerDashboardStats = {
  total_job_listings: number;
  active_job_listings: number;
  total_applications: number;
  pending_applications: number;
  shortlisted_applications: number;
  upcoming_interviews?: number;
  closed_listings?: number;
  total_applicants?: number;
  hired_applicants?: number;
  application_status_counts: Record<
    "pending" | "reviewing" | "shortlisted" | "interview" | "hired" | "rejected",
    number
  >;
  recent_applications: Array<{
    id: number;
    status: "pending" | "reviewing" | "shortlisted" | "interview" | "hired" | "rejected";
    applied_at: string | null;
    applicant: { id: number | null; name: string; photo_url: string | null };
    listing: { title: string };
  }>;
  upcoming_interview_records: Array<{
    id: number;
    application_id: number;
    status: "scheduled";
    scheduled_at: string | null;
    timezone: string;
    mode: "onsite" | "online" | "phone";
    location: string | null;
    applicant: { name: string; photo_url: string | null };
    listing: { title: string };
  }>;
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
