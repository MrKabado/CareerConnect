import type { ApplicantStatus } from "@/features/employer-applicants/statuses";

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
  timezone: string;
  format: "online" | "onsite";
  locationOrLink: string;
  message?: string;
};

export type OfferDetails = {
  startDate: string;
  notes?: string;
};

export type ApplicantStatusUpdatePayload = {
  note?: string;
  interviewDetails?: InterviewDetails;
  offerDetails?: OfferDetails;
  rejectionReason?: string;
  rejectionMessage?: string;
  hiredAt?: string;
  undoRejection?: boolean;
  changedBy?: string;
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
  match: number;
  status: ApplicantStatus;
  statusHistory?: ApplicantStatusHistoryEntry[];
  interviewDetails?: InterviewDetails;
  offerDetails?: OfferDetails;
  rejectionReason?: string;
  rejectionMessage?: string;
  hiredAt?: string;
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
