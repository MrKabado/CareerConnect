import type { ApplicantStatus } from "@/features/employer-applicants/statuses";
import type { PhilippineAddress } from "@/features/locations/types";

export type { ApplicantStatus } from "@/features/employer-applicants/statuses";

export type ApplicantStatusHistoryEntry = {
  from: ApplicantStatus;
  to: ApplicantStatus;
  changedBy: string;
  changedAt: string;
  note?: string;
};

export type InterviewDetails = {
  date: string;
  time: string;
  durationMinutes?: number;
  timezone: string;
  format: "online" | "onsite" | "phone";
  locationOrLink: string;
  message?: string;
};

export type InterviewAvailabilityDetails = {
  dates: string[];
  startTime: string;
  endTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  timezone: string;
  format: "online" | "onsite" | "phone";
  locationOrLink: string;
  locationAddress?: PhilippineAddress | null;
  message?: string;
};

export type OfferDetails = {
  startDate: string;
  notes?: string;
};

export type ApplicantStatusUpdatePayload = {
  note?: string;
  interviewAvailability?: InterviewAvailabilityDetails;
  rejectionReason?: string;
};

export type ApplicantDocument = {
  id: string;
  title: string;
  fileName: string;
  fileType: "PDF" | "DOC" | "DOCX" | "Link";
  mimeType?: string;
  dataUrl?: string;
  submittedAt: string;
  fileSize: string;
  preview: string[];
};

export type Applicant = {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  location: string;
  appliedDate: string;
  match?: number;
  status: ApplicantStatus;
  statusHistory?: ApplicantStatusHistoryEntry[];
  interviewDetails?: InterviewDetails;
  interviewId?: number;
  interviewStatus?: "invited" | "scheduled" | "completed" | "cancelled";
  interviewAvailability?: InterviewAvailabilityDetails;
  offerDetails?: OfferDetails;
  rejectionReason?: string;
  rejectionMessage?: string;
  hiredAt?: string;
  employmentEndedAt?: string;
  jobType: "Job" | "OJT";
  summary: string;
  skills: string[];
  experience: string;
  experienceDetails: string[];
  education: string;
  portfolio: string;
  email: string;
  phone: string;
  documents: ApplicantDocument[];
};
