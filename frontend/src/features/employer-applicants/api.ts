import { applicationStore, type Application } from "@/features/applications/applicationData";
import { applicantSeedData } from "@/features/employer-applicants/data";
import { isAllowedApplicantTransition } from "@/features/employer-applicants/statuses";
import type {
  Applicant,
  ApplicantStatus,
  ApplicantStatusHistoryEntry,
  ApplicantStatusUpdatePayload,
} from "@/features/employer-applicants/types";

const APPLICANT_STATE_STORAGE_KEY = "careerconnect.employer-applicants.state";
const NOTIFICATIONS_STORAGE_KEY = "careerconnect.employer-applicants.notifications";

type StoredApplicantState = {
  status: ApplicantStatus;
  history: ApplicantStatusHistoryEntry[];
  interviewDetails?: Applicant["interviewDetails"];
  offerDetails?: Applicant["offerDetails"];
  rejectionReason?: string;
  rejectionMessage?: string;
  hiredAt?: string;
};

const wait = (ms = 300) => new Promise((resolve) => window.setTimeout(resolve, ms));

function readApplicantStateStore(): Record<string, StoredApplicantState> {
  try {
    return JSON.parse(window.localStorage.getItem(APPLICANT_STATE_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function buildApplicant(applicant: Applicant, state?: StoredApplicantState): Applicant {
  return {
    ...applicant,
    ...state,
    status: state?.status ?? applicant.status,
    statusHistory: state?.history ?? [],
  };
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase()).join("");
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function withPortfolioWebsite(applicant: Applicant): Applicant {
  if (applicant.documents.some((document) => document.fileType === "Link")) {
    return applicant;
  }

  const slug = applicant.name
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const portfolioUrl = `portfolio.example/${slug || applicant.id}`;

  return {
    ...applicant,
    portfolio: portfolioUrl,
    documents: [
      ...applicant.documents,
      {
        id: "generated-portfolio",
        title: "Website portfolio",
        fileName: portfolioUrl,
        fileType: "Link",
        submittedAt: applicant.appliedDate,
        fileSize: "Portfolio website",
        preview: [
          `${applicant.name} | Portfolio`,
          applicant.role,
          applicant.summary,
          `Skills: ${applicant.skills.join(", ") || "Skills not provided"}`,
          `Experience: ${applicant.experienceDetails.join("; ") || applicant.experience}`,
          `Education: ${applicant.education}`,
          `Contact: ${applicant.email || "Not provided"}`,
        ],
      },
    ],
  };
}

function toEmployerApplicant(application: Application): Applicant {
  const name = application.applicantName?.trim() || "Applicant";
  return {
    id: `application-${application.id}`,
    name,
    initials: getInitials(name),
    role: application.title,
    department: application.track === "OJT" ? "Internship" : "Hiring team",
    location: application.applicantLocation || "Not provided",
    appliedDate: application.appliedAt,
    match: 0,
    status: "applied",
    jobType: application.track,
    summary: application.applicantSummary || "Applicant profile submitted with this application.",
    skills: application.applicantSkills ?? [],
    experience: application.applicantExperience || "Not provided",
    experienceDetails: [],
    education: application.applicantEducation || "Not provided",
    portfolio: "Not provided",
    email: application.applicantEmail || "",
    phone: "Not provided",
    documents: (application.documents ?? []).map((document) => {
      const extension = document.fileName.split(".").pop()?.toLowerCase();
      const fileType = document.mimeType === "application/pdf" || extension === "pdf"
        ? "PDF"
        : extension === "docx"
          ? "DOCX"
          : "DOC";
      return {
        id: `submitted-${document.id}`,
        title: document.title,
        fileName: document.fileName,
        fileType,
        mimeType: document.mimeType,
        dataUrl: document.dataUrl,
        submittedAt: application.appliedAt,
        fileSize: formatFileSize(document.size),
        preview: [],
      };
    }),
  };
}

function getAllEmployerApplicants() {
  const submittedApplicants = applicationStore.getSnapshot()
    .filter((application) => application.company === "Maya Philippines" && application.applicantName && application.documents?.length)
    .map(toEmployerApplicant);
  return [...applicantSeedData, ...submittedApplicants].map(withPortfolioWebsite);
}

export async function getEmployerApplicants(): Promise<Applicant[]> {
  await wait();
  const states = readApplicantStateStore();
  return getAllEmployerApplicants().map((applicant) => buildApplicant(applicant, states[applicant.id]));
}

export async function getApplicantById(applicantId: string): Promise<Applicant | null> {
  await wait();
  const applicant = getAllEmployerApplicants().find((candidate) => candidate.id === applicantId);
  if (!applicant) return null;

  return buildApplicant(applicant, readApplicantStateStore()[applicantId]);
}

export async function getHistory(applicantId: string): Promise<ApplicantStatusHistoryEntry[]> {
  await wait();
  return readApplicantStateStore()[applicantId]?.history ?? [];
}

export async function updateApplicantStatus(
  applicantId: string,
  to: ApplicantStatus,
  payload: ApplicantStatusUpdatePayload = {},
): Promise<Applicant> {
  await wait();
  const applicant = getAllEmployerApplicants().find((candidate) => candidate.id === applicantId);
  if (!applicant) {
    throw new Error("Applicant not found.");
  }

  const states = readApplicantStateStore();
  const existing = states[applicantId];
  const from = existing?.status ?? applicant.status;
  const isUndoingRejection = payload.undoRejection === true && from === "rejected" && to !== "rejected";
  if (!isUndoingRejection && !isAllowedApplicantTransition(from, to)) {
    throw new Error(`Transition from ${from} to ${to} is not allowed.`);
  }

  const changedAt = new Date().toISOString();
  const historyEntry: ApplicantStatusHistoryEntry = {
    from,
    to,
    changedBy: payload.changedBy ?? "Maya Philippines",
    changedAt,
    ...(payload.note ? { note: payload.note } : {}),
  };
  const nextState: StoredApplicantState = {
    status: to,
    history: [...(existing?.history ?? []), historyEntry],
    ...(existing?.interviewDetails ? { interviewDetails: existing.interviewDetails } : {}),
    ...(existing?.offerDetails ? { offerDetails: existing.offerDetails } : {}),
    ...(existing?.hiredAt ? { hiredAt: existing.hiredAt } : {}),
    ...(to === "interview_scheduled" && payload.interviewDetails ? { interviewDetails: payload.interviewDetails } : {}),
    ...(to === "offer_extended" && payload.offerDetails ? { offerDetails: payload.offerDetails } : {}),
    ...(to === "rejected" ? {
      rejectionReason: payload.rejectionReason?.trim() || "",
      rejectionMessage: payload.rejectionMessage ?? "",
    } : {}),
    ...(to === "hired" ? { hiredAt: payload.hiredAt ?? changedAt } : {}),
  };
  if (from === "rejected" && to !== "rejected") {
    delete nextState.rejectionReason;
    delete nextState.rejectionMessage;
  }

  states[applicantId] = nextState;
  window.localStorage.setItem(APPLICANT_STATE_STORAGE_KEY, JSON.stringify(states));

  const applicationId = Number(applicantId.replace(/^application-/, ""));
  if (
    to === "interview_scheduled" &&
    payload.interviewDetails &&
    Number.isSafeInteger(applicationId)
  ) {
    applicationStore.scheduleInterview(applicationId, payload.interviewDetails);
  }

  try {
    const notifications = JSON.parse(window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? "[]") as Array<{ applicantId: string; status: ApplicantStatus; createdAt: string }>;
    notifications.push({ applicantId, status: to, createdAt: changedAt });
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Notification persistence is best-effort in this frontend mock.
  }

  return buildApplicant(applicant, nextState);
}

// TODO(backend): Persist applicant transitions and history, and send email and in-app notifications.
