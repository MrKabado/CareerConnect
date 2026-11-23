import { apiRequest } from "@/lib/axios";

export type ApplicantApplicationRecord = {
  id: number;
  status: "pending" | "reviewing" | "shortlisted" | "interview" | "hired" | "rejected";
  cover_letter: string | null;
  cover_letter_document?: {
    original_filename: string;
    mime_type: string;
    file_size: number;
  } | null;
  applied_at: string | null;
  rejected_at: string | null;
  reapply_available_at: string | null;
  reapplication_allowed: boolean;
  hired_at: string | null;
  employment_ended_at: string | null;
  interview: {
    id: number;
    status: "invited" | "scheduled" | "completed" | "cancelled";
    scheduled_at: string | null;
    end_at: string | null;
    timezone: string;
    mode: "onsite" | "online" | "phone";
    location: string | null;
    meeting_url: string | null;
    meeting_instructions: string | null;
    applicant_notes: string | null;
  } | null;
  listing: {
    id: number;
    title: string;
    listing_type: "job" | "ojt";
    location: string;
    work_setup: string;
    status: string;
    company_name: string | null;
  } | null;
  resume: { original_filename: string; mime_type: string; file_size: number } | null;
  status_history: Array<{
    previous_status: string | null;
    status: string;
    public_reason: string | null;
    created_at: string | null;
  }>;
};

export type ApplicantApplicationsPage = {
  data: ApplicantApplicationRecord[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type ApplicantListingStatus = {
  listing_id: number;
  status: ApplicantApplicationRecord["status"];
  rejected_at: string | null;
  reapply_available_at: string | null;
  reapplication_allowed: boolean;
};

export type ApplicantInterviewAvailability = {
  interview_id: number;
  timezone: string;
  mode: "onsite" | "online" | "phone";
  location: string | null;
  meeting_url: string | null;
  meeting_instructions: string | null;
  listing_title: string | null;
  company_name: string | null;
  dates: Array<{
    date: string;
    slots: Array<{ start_time: string; end_time: string }>;
  }>;
};

export const applicantApplicationsApi = {
  eligibility(token: string) {
    return apiRequest<{
      can_apply: boolean;
      reason: string | null;
      identity_verification_status: "unverified" | "pending" | "verified" | "rejected";
      identity_verification_rejection_reason: string | null;
    }>(
      "/applicant/application-eligibility",
      {},
      token,
    );
  },

  list(token: string, page = 1) {
    return apiRequest<ApplicantApplicationsPage>(
      "/applicant/applications",
      { params: { page, per_page: 50 } },
      token,
    );
  },

  listingStatuses(token: string, listingIds: number[]) {
    return apiRequest<{ data: ApplicantListingStatus[] }>(
      "/applicant/job-listing-statuses",
      { params: { listing_ids: listingIds } },
      token,
    );
  },

  submit(token: string, listingId: number, coverLetterDocumentId?: number) {
    return apiRequest<{ message: string; data: ApplicantApplicationRecord }>(
      `/jobs/${listingId}/applications`,
      {
        method: "POST",
        data: coverLetterDocumentId
          ? { cover_letter_document_id: coverLetterDocumentId }
          : {},
      },
      token,
    );
  },

  interviewAvailability(token: string, interviewId: number) {
    return apiRequest<{ data: ApplicantInterviewAvailability }>(
      `/applicant/interviews/${interviewId}/availability`,
      {},
      token,
    );
  },

  bookInterview(token: string, interviewId: number, date: string, startTime: string) {
    return apiRequest<{ message: string; data: { id: number; status: string } }>(
      `/applicant/interviews/${interviewId}/schedule`,
      { method: "POST", data: { date, start_time: startTime } },
      token,
    );
  },

  cancelInterview(token: string, interviewId: number, reason?: string) {
    return apiRequest<{ message: string }>(
      `/applicant/interviews/${interviewId}/cancel`,
      { method: "POST", data: reason ? { reason } : {} },
      token,
    );
  },
};

export function applicationStatusLabel(
  status: ApplicantApplicationRecord["status"],
): "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Hired" | "Rejected" {
  switch (status) {
    case "pending":
      return "Applied";
    case "reviewing":
      return "Under Review";
    case "shortlisted":
      return "Shortlisted";
    case "interview":
      return "Interview Scheduled";
    case "hired":
      return "Hired";
    case "rejected":
      return "Rejected";
  }
}
