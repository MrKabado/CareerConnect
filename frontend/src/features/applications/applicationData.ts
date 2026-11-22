import type { InterviewDetails } from "@/features/employer-applicants/types";

export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Hired"
  | "Rejected";

export type ApplicationTrack = "Job" | "OJT";

export type SubmittedApplicationDocument = {
  id: "resume" | "application-letter" | "cover-letter";
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

export type Application = {
  id: number;
  jobListingId?: string;
  companyInitial: string;
  title: string;
  company: string;
  appliedAt: string;
  status: ApplicationStatus;
  track: ApplicationTrack;
  rejectionReason?: string;
  rejectedAt?: string;
  reapplyAvailableAt?: string;
  reapplicationAllowed?: boolean;
  hiredAt?: string;
  employmentEndedAt?: string | null;
  interviewSchedule?: Pick<InterviewDetails, "date" | "time" | "timezone"> & {
    mode?: "onsite" | "online" | "phone";
    meetingUrl?: string | null;
    meetingInstructions?: string | null;
    location?: string | null;
  };
  resumeFileName?: string;
  applicationLetterFileName?: string;
  coverLetterFileName?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantLocation?: string;
  applicantEducation?: string;
  applicantExperience?: string;
  applicantSkills?: string[];
  applicantSummary?: string;
  documents?: SubmittedApplicationDocument[];
};

export const applications: Application[] = [];

const storageKey = "careerconnect.applications";
const legacySampleApplications = new Map([
  [1, { company: "Sprout Solutions", title: "Frontend Developer" }],
  [2, { company: "Globe Telecom", title: "Software Engineering Intern" }],
  [3, { company: "Kumu", title: "Junior UI Developer" }],
  [4, { company: "Concentrix Philippines", title: "Web Support Specialist" }],
  [5, { company: "Canva Philippines", title: "Product Design Intern" }],
  [6, { company: "Maya Philippines", title: "Junior Frontend Engineer" }],
]);
const listeners = new Set<() => void>();
let applicationSnapshot = loadApplications();

function isApplication(value: unknown): value is Application {
  if (!value || typeof value !== "object") return false;
  const application = value as Partial<Application>;
  return (
    typeof application.id === "number" &&
    typeof application.companyInitial === "string" &&
    typeof application.title === "string" &&
    typeof application.company === "string" &&
    typeof application.appliedAt === "string" &&
    typeof application.status === "string" &&
    typeof application.track === "string"
  );
}

function loadApplications(): Application[] {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isApplication)) {
    throw new Error("Saved application data is invalid.");
  }

  return parsed.filter((application) => {
    const sample = legacySampleApplications.get(application.id);
    return !sample ||
      sample.company !== application.company ||
      sample.title !== application.title;
  });
}

export const applicationStore = {
  getSnapshot: () => applicationSnapshot,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  scheduleInterview(applicationId: number, interviewDetails: InterviewDetails) {
    const applicationExists = applicationSnapshot.some(
      (application) => application.id === applicationId,
    );
    if (!applicationExists) return false;

    const nextSnapshot = applicationSnapshot.map((application) =>
      application.id === applicationId
        ? {
            ...application,
            status: "Interview Scheduled" as const,
            interviewSchedule: {
              date: interviewDetails.date,
              time: interviewDetails.time,
              timezone: interviewDetails.timezone,
            },
          }
        : application,
    );
    localStorage.setItem(storageKey, JSON.stringify(nextSnapshot));
    applicationSnapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
    return true;
  },

  hasAppliedTo(jobListingId: string) {
    return applicationSnapshot.some(
      (application) => application.jobListingId === jobListingId,
    );
  },

  addJobApplication(application: Omit<Application, "id">) {
    if (
      application.jobListingId &&
      applicationSnapshot.some(
        (saved) => saved.jobListingId === application.jobListingId,
      )
    ) {
      return false;
    }

    const nextApplication = {
      ...application,
      id:
        Math.max(0, ...applicationSnapshot.map((item) => item.id)) + 1,
    };
    const nextSnapshot = [nextApplication, ...applicationSnapshot];
    localStorage.setItem(storageKey, JSON.stringify(nextSnapshot));
    applicationSnapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
    return true;
  },
};
