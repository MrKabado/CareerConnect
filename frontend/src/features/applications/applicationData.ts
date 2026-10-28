export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Hired"
  | "Rejected";

export type ApplicationTrack = "Job" | "OJT";

export type Application = {
  id: number;
  jobListingId?: string;
  companyInitial: string;
  title: string;
  company: string;
  appliedAt: string;
  status: ApplicationStatus;
  track: ApplicationTrack;
  resumeFileName?: string;
  applicationLetterFileName?: string;
};

export const applications: Application[] = [
  {
    id: 1,
    companyInitial: "S",
    title: "Frontend Developer",
    company: "Sprout Solutions",
    appliedAt: "Jun 18, 2026",
    status: "Interview Scheduled",
    track: "Job",
  },
  {
    id: 2,
    companyInitial: "G",
    title: "Software Engineering Intern",
    company: "Globe Telecom",
    appliedAt: "Jun 15, 2026",
    status: "Shortlisted",
    track: "OJT",
  },
  {
    id: 3,
    companyInitial: "K",
    title: "Junior UI Developer",
    company: "Kumu",
    appliedAt: "Jun 12, 2026",
    status: "Under Review",
    track: "Job",
  },
  {
    id: 4,
    companyInitial: "C",
    title: "Web Support Specialist",
    company: "Concentrix Philippines",
    appliedAt: "Jun 8, 2026",
    status: "Applied",
    track: "Job",
  },
  {
    id: 5,
    companyInitial: "C",
    title: "Product Design Intern",
    company: "Canva Philippines",
    appliedAt: "May 28, 2026",
    status: "Hired",
    track: "OJT",
  },
  {
    id: 6,
    companyInitial: "M",
    title: "Junior Frontend Engineer",
    company: "Maya Philippines",
    appliedAt: "May 20, 2026",
    status: "Rejected",
    track: "Job",
  },
];

const storageKey = "careerconnect.applications";
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
  if (!stored) return [...applications];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isApplication)) {
    throw new Error("Saved application data is invalid.");
  }

  const persistedById = new Map(
    parsed.map((application) => [application.id, application]),
  );
  return [
    ...applications.filter((application) => !persistedById.has(application.id)),
    ...parsed,
  ];
}

export const applicationStore = {
  getSnapshot: () => applicationSnapshot,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
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
