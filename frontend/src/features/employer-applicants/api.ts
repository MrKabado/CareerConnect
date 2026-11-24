import { apiBlob, apiRequest } from "@/lib/axios";
import type {
  Applicant,
  ApplicantStatus,
  ApplicantStatusHistoryEntry,
  ApplicantStatusUpdatePayload,
  InterviewAvailabilityDetails,
} from "@/features/employer-applicants/types";
import { emptyPhilippineAddress } from "@/features/locations/types";

export type BackendApplicationStatus = "pending" | "reviewing" | "shortlisted" | "interview" | "hired" | "rejected";
type BackendStatus = BackendApplicationStatus;
type ApplicationRecord = {
  id: number;
  status: BackendStatus;
  match_score: number;
  match_reasons: string[];
  cover_letter: string | null;
  cover_letter_document?: {
    original_filename: string;
    mime_type: string;
    file_size: number;
  } | null;
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
  id: number;
  status: "invited" | "scheduled" | "completed" | "cancelled";
  scheduled_at: string | null;
  end_at: string | null;
  timezone: string;
  mode: "online" | "onsite" | "phone";
  location: string | null;
  street_address?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  province_code?: string | null;
  province_name?: string | null;
  city_municipality_code?: string | null;
  city_municipality_name?: string | null;
  barangay_code?: string | null;
  barangay_name?: string | null;
  zip_code?: string | null;
  meeting_url: string | null;
  meeting_instructions: string | null;
  applicant_notes?: string | null;
  availability: Array<{
    date: string;
    start_time: string;
    end_time: string;
    break_start_time: string | null;
    break_end_time: string | null;
    duration_minutes: number;
    buffer_minutes: number;
  }>;
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
    durationMinutes: interview.end_at
      ? Math.max(0, Math.round((new Date(interview.end_at).getTime() - date.getTime()) / 60000))
      : undefined,
    timezone: interview.timezone,
    format: interview.mode,
    locationOrLink: interview.mode === "online"
      ? interview.meeting_url ?? interview.meeting_instructions ?? ""
      : interview.mode === "onsite"
        ? interview.location ?? ""
        : interview.meeting_instructions ?? "",
    message: interview.meeting_instructions ?? undefined,
  };
}

function mapAvailability(interview: InterviewRecord | undefined): InterviewAvailabilityDetails | undefined {
  const first = interview?.availability[0];
  if (!interview || !first) return undefined;
  return {
    dates: interview.availability.map((item) => item.date),
    startTime: first.start_time,
    endTime: first.end_time,
    breakStartTime: first.break_start_time,
    breakEndTime: first.break_end_time,
    durationMinutes: first.duration_minutes,
    bufferMinutes: first.buffer_minutes,
    timezone: interview.timezone,
    format: interview.mode,
    locationOrLink: interview.mode === "online"
      ? interview.meeting_url ?? ""
      : interview.mode === "onsite"
        ? interview.location ?? ""
        : "",
    locationAddress: {
      ...emptyPhilippineAddress(),
      region_code: interview.region_code ?? null,
      region_name: interview.region_name ?? null,
      province_code: interview.province_code ?? null,
      province_name: interview.province_name ?? null,
      city_municipality_code: interview.city_municipality_code ?? null,
      city_municipality_name: interview.city_municipality_name ?? null,
      barangay_code: interview.barangay_code ?? null,
      barangay_name: interview.barangay_name ?? null,
      street_address: interview.street_address ?? null,
      zip_code: interview.zip_code ?? null,
    },
    message: interview.applicant_notes ?? interview.meeting_instructions ?? undefined,
  };
}

function interviewLocationPayload(details: InterviewAvailabilityDetails) {
  if (details.format === "onsite") {
    const address = details.locationAddress;
    return {
      location: details.locationOrLink,
      ...(address ? {
        region_code: address.region_code,
        province_code: address.province_code,
        city_municipality_code: address.city_municipality_code,
        barangay_code: address.barangay_code,
        street_address: address.street_address,
        zip_code: address.zip_code,
      } : {}),
    };
  }
  if (details.format === "online") return { meeting_url: details.locationOrLink };
  return {};
}

function toApplicant(record: ApplicationRecord, interview?: InterviewRecord): Applicant {
  const name = record.applicant?.name ?? "Applicant";
  const resume = record.resume;
  const coverLetterDocument = record.cover_letter_document ?? null;
  const mimeType = resume?.mime_type ?? "";
  const extension = resume?.original_filename.split(".").pop()?.toLowerCase();
  const fileType = mimeType === "application/pdf" || extension === "pdf"
    ? "PDF"
    : extension === "docx" ? "DOCX" : "DOC";
  const statusHistory = mapHistory(record);
  const interviewDetails = mapInterview(interview);
  const interviewAvailability = mapAvailability(interview);
  const rejectionReason = [...statusHistory].reverse().find((entry) => entry.to === "rejected")?.note;
  return {
    id: `application-${record.id}`,
    name,
    initials: name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(),
    role: record.listing?.title ?? "Listing unavailable",
    department: record.listing?.listing_type === "ojt" ? "OJT" : "Job",
    location: record.applicant?.city ?? "Not provided",
    appliedDate: formatDate(record.applied_at),
    match: record.match_score,
    status: toFrontendStatus(record.status),
    statusHistory,
    ...(record.hired_at ? { hiredAt: record.hired_at } : {}),
    ...(record.employment_ended_at ? { employmentEndedAt: record.employment_ended_at } : {}),
    ...(interviewDetails ? { interviewDetails } : {}),
    ...(interview ? { interviewId: interview.id, interviewStatus: interview.status } : {}),
    ...(interviewAvailability ? { interviewAvailability } : {}),
    jobType: record.listing?.listing_type === "ojt" ? "OJT" : "Job",
    summary: record.cover_letter?.trim() ||
      (coverLetterDocument
        ? `Cover letter document: ${coverLetterDocument.original_filename}`
        : "No cover letter was submitted."),
    skills: record.applicant?.skills ?? [],
    experience: "Not provided",
    experienceDetails: [],
    education: "Not provided",
    portfolio: "Not provided",
    email: "",
    phone: record.applicant?.phone ?? "Not provided",
    ...(rejectionReason ? { rejectionReason } : {}),
    documents: [
      ...(resume ? [{
        id: `resume-${record.id}`,
        title: "Resume",
        fileName: resume.original_filename,
        fileType,
        mimeType,
        submittedAt: formatDate(record.applied_at),
        fileSize: formatFileSize(resume.file_size),
        preview: [],
      } satisfies Applicant["documents"][number]] : []),
      ...(coverLetterDocument ? [{
        id: `cover-letter-${record.id}`,
        title: "Cover letter",
        fileName: coverLetterDocument.original_filename,
        fileType: coverLetterDocument.mime_type === "application/pdf" ||
          /\.pdf$/i.test(coverLetterDocument.original_filename) ? "PDF" :
          /\.docx$/i.test(coverLetterDocument.original_filename) ? "DOCX" : "DOC",
        mimeType: coverLetterDocument.mime_type,
        submittedAt: formatDate(record.applied_at),
        fileSize: formatFileSize(coverLetterDocument.file_size),
        preview: [],
      } satisfies Applicant["documents"][number]] : []),
    ],
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
  status?: BackendApplicationStatus,
): Promise<{ applicants: Applicant[]; currentPage: number; lastPage: number; total: number }> {
  const response = await apiRequest<ApplicationListResponse>(
    "/employer/applications",
    { params: { per_page: 50, page, ...(status ? { status } : {}) } },
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
  return toApplicant(application.data, [...interviews.data].sort((a, b) => b.id - a.id)[0]);
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
    const details = payload.interviewAvailability;
    if (!details) throw new Error("Interview availability is required to invite an applicant.");
    const response = await apiRequest<{ data: InterviewRecord }>(
      `/employer/applications/${id}/interviews`,
      {
        method: "POST",
        data: {
          availability_dates: details.dates,
          start_time: details.startTime,
          end_time: details.endTime,
          break_start_time: details.breakStartTime,
          break_end_time: details.breakEndTime,
          duration_minutes: details.durationMinutes,
          buffer_minutes: details.bufferMinutes,
          timezone: details.timezone,
          mode: details.format,
          ...interviewLocationPayload(details),
          ...(details.message ? { applicant_notes: details.message } : {}),
        },
      },
      token,
    );
    return {
      ...currentApplicant,
      status: "interview_scheduled",
      interviewId: response.data.id,
      interviewStatus: response.data.status,
      interviewAvailability: mapAvailability(response.data),
      statusHistory: [
        ...(currentApplicant.statusHistory ?? []),
        {
          from: currentApplicant.status,
          to: "interview_scheduled",
          changedBy: "Recorded",
          changedAt: new Date().toISOString(),
          note: "The applicant was invited to schedule an interview.",
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

export async function updateApplicantInterviewAvailability(
  token: string,
  applicant: Applicant,
  details: InterviewAvailabilityDetails,
): Promise<Applicant> {
  if (!applicant.interviewId) throw new Error("No active interview invitation was found.");
  const response = await apiRequest<{ data: InterviewRecord }>(
    `/employer/interviews/${applicant.interviewId}/availability`,
    {
      method: "PUT",
      data: {
        availability_dates: details.dates,
        start_time: details.startTime,
        end_time: details.endTime,
        break_start_time: details.breakStartTime,
        break_end_time: details.breakEndTime,
        duration_minutes: details.durationMinutes,
        buffer_minutes: details.bufferMinutes,
        timezone: details.timezone,
        mode: details.format,
        ...interviewLocationPayload(details),
        ...(details.message ? { applicant_notes: details.message } : {}),
      },
    },
    token,
  );
  return {
    ...applicant,
    interviewStatus: response.data.status,
    interviewAvailability: mapAvailability(response.data),
    ...(response.data.status === "scheduled" ? { interviewDetails: mapInterview(response.data) } : {}),
  };
}

export async function inviteApplicantAgain(
  token: string,
  applicantId: string,
  applicant: Applicant,
  details: InterviewAvailabilityDetails,
): Promise<Applicant> {
  const id = getApplicationId(applicantId);
  const response = await apiRequest<{ data: InterviewRecord }>(
    `/employer/applications/${id}/interviews`,
    {
      method: "POST",
      data: {
        availability_dates: details.dates,
        start_time: details.startTime,
        end_time: details.endTime,
        break_start_time: details.breakStartTime,
        break_end_time: details.breakEndTime,
        duration_minutes: details.durationMinutes,
        buffer_minutes: details.bufferMinutes,
        timezone: details.timezone,
        mode: details.format,
        ...interviewLocationPayload(details),
        ...(details.message ? { applicant_notes: details.message } : {}),
      },
    },
    token,
  );
  const applicantWithoutSchedule = { ...applicant };
  delete applicantWithoutSchedule.interviewDetails;
  return {
    ...applicantWithoutSchedule,
    interviewId: response.data.id,
    interviewStatus: response.data.status,
    interviewAvailability: mapAvailability(response.data),
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

export async function getEmployerApplicantResumeUrls(
  token: string,
  applicantId: string,
): Promise<{ previewUrl: string; downloadUrl: string } | null> {
  const applicationId = getApplicationId(applicantId);
  const response = await apiRequest<{
    data: { preview_url: string; download_url: string } | null;
  }>(`/employer/applications/${applicationId}/resume-urls`, {}, token);

  return response.data
    ? {
        previewUrl: response.data.preview_url,
        downloadUrl: response.data.download_url,
      }
    : null;
}

export function downloadEmployerApplicantCoverLetter(token: string, applicantId: string) {
  const applicationId = getApplicationId(applicantId);
  return apiBlob(`/employer/applications/${applicationId}/cover-letter`, token);
}
