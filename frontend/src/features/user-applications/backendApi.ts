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

export const applicantApplicationsApi = {
  list(token: string, page = 1) {
    return apiRequest<ApplicantApplicationsPage>(
      "/applicant/applications",
      { params: { page, per_page: 50 } },
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
