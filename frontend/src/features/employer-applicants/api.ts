import { apiBlob, apiRequest } from "@/lib/axios";
import type { Applicant, ApplicantStatus, ApplicantStatusHistoryEntry, ApplicantStatusUpdatePayload } from "@/features/employer-applicants/types";

type BackendStatus = "pending" | "reviewing" | "shortlisted" | "interview" | "hired" | "rejected";
type ApplicationRecord = {
  id: number;
  status: BackendStatus;
  cover_letter: string | null;
  applied_at: string | null;
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
  applicant: {
    id: number;
    name: string;
    city: string | null;
    phone: string | null;
    skills: string[];
    interests: Array<{ id: number; name: string }>;
  } | null;
  resume: { original_filename: string; mime_type: string; file_size: number } | null;
  status_history: Array<{
    previous_status: BackendStatus | null;
    status: BackendStatus;
    public_reason: string | null;
    internal_reason?: string | null;
    created_at: string | null;
  }>;
};

type ApplicationResponse = { data: ApplicationRecord };
type ApplicationListResponse = {
  data: ApplicationRecord[];
  meta: { current_page: number; last_page: number; total: number };
};
type InterviewRecord = {
  scheduled_at: string | null;
  timezone: string;
  mode: "online" | "onsite";
  location: string | null;
  meeting_url: string | null;
  meeting_instructions: string | null;
};

function toFrontendStatus(status: BackendStatus): ApplicantStatus {
  switch (status) {
    case "pending": return "applied";
    case "reviewing": return "under_review";
    case "shortlisted": return "shortlisted";
    case "interview": return "interview_scheduled";
    case "hired": return "hired";
    case "rejected": return "rejected";
  }
}

function toBackendStatus(status: ApplicantStatus): BackendStatus {
  switch (status) {
    case "applied": return "pending";
    case "under_review": return "reviewing";
    case "shortlisted": return "shortlisted";
    case "interview_scheduled": return "interview";
    case "hired": return "hired";
    case "rejected": return "rejected";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatFileSize(size: number): string {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function mapHistory(record: ApplicationRecord): ApplicantStatusHistoryEntry[] {
  return record.status_history.map((entry) => ({
    from: entry.previous_status ? toFrontendStatus(entry.previous_status) : "applied",
    to: toFrontendStatus(entry.status),
    changedBy: "Recorded",
    changedAt: entry.created_at ?? "",
    ...(entry.public_reason ? { note: entry.public_reason } : {}),
  }));
}

function mapInterview(interview: InterviewRecord | undefined): Applicant["interviewDetails"] {
  if (!interview?.scheduled_at) return undefined;
  const date = new Date(interview.scheduled_at);
  if (Number.isNaN(date.getTime())) return undefined;
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: interview.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: interview.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return {
    date: dateParts,
    time: timeParts,
    timezone: interview.timezone,
    format: interview.mode === "online" ? "online" : "onsite",
    locationOrLink: interview.mode === "online"
      ? interview.meeting_url ?? interview.meeting_instructions ?? ""
      : interview.location ?? "",
    message: interview.meeting_instructions ?? undefined,
  };
}

function toApplicant(record: ApplicationRecord, interview?: InterviewRecord): Applicant {
  const name = record.applicant?.name ?? "Applicant";
  const resume = record.resume;
  const mimeType = resume?.mime_type ?? "";
  const extension = resume?.original_filename.split(".").pop()?.toLowerCase();
  const fileType = mimeType === "application/pdf" || extension === "pdf"
    ? "PDF"
    : extension === "docx" ? "DOCX" : "DOC";
  const statusHistory = mapHistory(record);
  const interviewDetails = mapInterview(interview);
  const rejectionReason = [...statusHistory].reverse().find((entry) => entry.to === "rejected")?.note;
  return {
    id: `application-${record.id}`,
    name,
    initials: name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(),
    role: record.listing?.title ?? "Listing unavailable",
    department: record.listing?.listing_type === "ojt" ? "OJT" : "Job",
    location: record.applicant?.city ?? "Not provided",
    appliedDate: formatDate(record.applied_at),
    status: toFrontendStatus(record.status),
    statusHistory,
    ...(record.hired_at ? { hiredAt: record.hired_at } : {}),
    ...(record.employment_ended_at ? { employmentEndedAt: record.employment_ended_at } : {}),
    ...(interviewDetails ? { interviewDetails } : {}),
    jobType: record.listing?.listing_type === "ojt" ? "OJT" : "Job",
    summary: record.cover_letter?.trim() || "No cover letter was submitted.",
    skills: record.applicant?.skills ?? [],
    experience: "Not provided",
    experienceDetails: [],
    education: "Not provided",
    portfolio: "Not provided",
    email: "",
    phone: record.applicant?.phone ?? "Not provided",
    ...(rejectionReason ? { rejectionReason } : {}),
    documents: resume ? [{
      id: `resume-${record.id}`,
      title: "Resume",
      fileName: resume.original_filename,
      fileType,
      mimeType,
      submittedAt: formatDate(record.applied_at),
      fileSize: formatFileSize(resume.file_size),
      preview: [],
    }] : [],
  };
}

function getApplicationId(applicantId: string): number {
  const match = /^application-(\d+)$/.exec(applicantId);
  const id = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid application identifier.");
  return id;
}

export async function getEmployerApplicants(
  token: string,
  page = 1,
): Promise<{ applicants: Applicant[]; currentPage: number; lastPage: number; total: number }> {
  const response = await apiRequest<ApplicationListResponse>(
    "/employer/applications",
    { params: { per_page: 50, page } },
    token,
  );
  return {
    applicants: response.data.map((record) => toApplicant(record)),
    currentPage: response.meta.current_page,
    lastPage: response.meta.last_page,
    total: response.meta.total,
  };
}

export async function getApplicantById(token: string, applicantId: string): Promise<Applicant | null> {
  const id = getApplicationId(applicantId);
  const [application, interviews] = await Promise.all([
    apiRequest<ApplicationResponse>(`/employer/applications/${id}`, {}, token),
    apiRequest<{ data: InterviewRecord[] }>(`/employer/applications/${id}/interviews`, {}, token),
  ]);
  return toApplicant(application.data, interviews.data[0]);
}

export async function updateApplicantStatus(
  token: string,
  applicantId: string,
  to: ApplicantStatus,
  currentApplicant: Applicant,
  payload: ApplicantStatusUpdatePayload = {},
): Promise<Applicant> {
  const id = getApplicationId(applicantId);
  if (to === "interview_scheduled") {
    const details = payload.interviewDetails;
    if (!details) throw new Error("Interview details are required to schedule an interview.");
    const response = await apiRequest<{ data: InterviewRecord }>(
      `/employer/applications/${id}/interviews`,
      {
        method: "POST",
        data: {
          scheduled_at: `${details.date}T${details.time}:00`,
          timezone: details.timezone,
          mode: details.format,
          ...(details.format === "onsite"
            ? { location: details.locationOrLink }
            : { meeting_url: details.locationOrLink }),
          ...(details.message ? { applicant_notes: details.message } : {}),
        },
      },
      token,
    );
    const interviewDetails = mapInterview(response.data);
    if (!interviewDetails) throw new Error("The interview was saved but the server returned invalid schedule details.");
    return {
      ...currentApplicant,
      status: "interview_scheduled",
      interviewDetails,
      statusHistory: [
        ...(currentApplicant.statusHistory ?? []),
        {
          from: currentApplicant.status,
          to: "interview_scheduled",
          changedBy: "Recorded",
          changedAt: response.data.scheduled_at ?? "",
          note: "An interview has been scheduled.",
        },
      ],
    };
  }

  const response = await apiRequest<ApplicationResponse>(
    `/employer/applications/${id}/status`,
    {
      method: "PATCH",
      data: {
        status: toBackendStatus(to),
        ...(payload.rejectionReason ? { public_reason: payload.rejectionReason } : {}),
      },
    },
    token,
  );
  const updated = toApplicant(response.data);
  return {
    ...currentApplicant,
    status: updated.status,
    statusHistory: updated.statusHistory,
    ...(to === "rejected" && payload.rejectionReason?.trim()
      ? { rejectionReason: payload.rejectionReason.trim() }
      : {}),
  };
}

export async function recordApplicantEmploymentEnd(
  token: string,
  applicantId: string,
  employmentEndedAt: string,
  currentApplicant: Applicant,
): Promise<Applicant> {
  const id = getApplicationId(applicantId);
  const response = await apiRequest<ApplicationResponse>(
    `/employer/applications/${id}/employment/end`,
    {
      method: "PATCH",
      data: { employment_ended_at: employmentEndedAt },
    },
    token,
  );
  const updated = toApplicant(response.data);

  if (!updated.hiredAt || !updated.employmentEndedAt) {
    throw new Error("The employment end date was saved, but the server returned an incomplete employment record.");
  }

  return {
    ...currentApplicant,
    hiredAt: updated.hiredAt,
    employmentEndedAt: updated.employmentEndedAt,
  };
}

export function downloadEmployerApplicantResume(token: string, applicantId: string) {
  const applicationId = getApplicationId(applicantId);
  return apiBlob(`/employer/applications/${applicationId}/resume`, token);
}
