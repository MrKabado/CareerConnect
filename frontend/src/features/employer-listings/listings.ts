export type EmployerListingStatus = "active" | "draft" | "closed" | "full" | "expired" | "deactivated";

export type EmployerListing = {
  id: string;
  publicId: string;
  companySlug: string;
  title: string;
  type: "Job" | "OJT";
  category: string;
  categoryId?: number;
  location: string;
  department: string;
  applicants?: number;
  applicantLimit?: number;
  approvalStatus?: "not_required" | "pending" | "approved" | "rejected";
  approvalReason?: string | null;
  shortlisted?: number;
  status: EmployerListingStatus;
  updated: string;
  description: string;
  responsibilities: string[];
  salary: string;
  skills: string[];
  experienceRequirement?: string;
  requiredSkills?: string[];
  workSetup?: "onsite" | "hybrid" | "remote";
  salaryMin?: number | null;
  salaryMax?: number | null;
  employmentType?: "full_time" | "part_time" | "contract";
  minimumExperienceYears?: number | null;
  hiring: {
    type: string;
    schedule: string;
    schoolPartnerships: string;
    workspace: string;
  };
};

const STORAGE_KEY = "careerconnect.employer-listings.records.v1";
const LISTINGS_CHANGED_EVENT = "careerconnect:employer-listings-changed";

const legacySampleListingIds = new Set([
  "frontend-developer",
  "software-engineer",
  "customer-experience-specialist",
  "product-designer",
  "finance-operations-trainee",
  "data-analyst",
]);

function normalizeCompanySlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
function isEmployerListing(value: unknown): value is EmployerListing {
  if (!value || typeof value !== "object") return false;
  const listing = value as Partial<EmployerListing>;
  return (
    typeof listing.id === "string" &&
    typeof listing.publicId === "string" &&
    typeof listing.companySlug === "string" &&
    typeof listing.title === "string" &&
    (listing.type === "Job" || listing.type === "OJT") &&
    typeof listing.category === "string" &&
    typeof listing.location === "string" &&
    typeof listing.department === "string" &&
    typeof listing.applicants === "number" &&
    typeof listing.shortlisted === "number" &&
    ["active", "draft", "closed"].includes(listing.status ?? "") &&
    typeof listing.updated === "string" &&
    typeof listing.description === "string" &&
    Array.isArray(listing.responsibilities) &&
    listing.responsibilities.every((item) => typeof item === "string") &&
    typeof listing.salary === "string" &&
    Array.isArray(listing.skills) &&
    listing.skills.every((item) => typeof item === "string") &&
    Boolean(listing.hiring) &&
    typeof listing.hiring?.type === "string" &&
    typeof listing.hiring?.schedule === "string" &&
    typeof listing.hiring?.schoolPartnerships === "string" &&
    typeof listing.hiring?.workspace === "string"
  );
}

function readListings(): EmployerListing[] {
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  if (!serialized) return [];

  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed) || !parsed.every(isEmployerListing)) {
    throw new Error("Saved employer listings are invalid.");
  }
  return parsed.filter(
    (listing) =>
      listing.companySlug !== "maya-philippines" ||
      !legacySampleListingIds.has(listing.id),
  );
}

let listingsSnapshot = readListings();
const listeners = new Set<() => void>();

export function getEmployerListingsSnapshot(): EmployerListing[] {
  return listingsSnapshot;
}

export function subscribeEmployerListings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListingsChanged() {
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new Event(LISTINGS_CHANGED_EVENT));
}

function writeListings(nextListings: EmployerListing[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextListings));
  listingsSnapshot = nextListings;
  notifyListingsChanged();
}

export function saveEmployerListing(listing: EmployerListing): void {
  saveEmployerListings([listing]);
}

export function saveEmployerListings(updatedListings: EmployerListing[]): void {
  const updatedIds = new Set(updatedListings.map((listing) => listing.id));
  const nextListings = [
    ...listingsSnapshot.filter((current) => !updatedIds.has(current.id)),
    ...updatedListings,
  ];
  writeListings(nextListings);
}

export function getEmployerListings(companySlug: string): EmployerListing[] {
  const normalizedSlug = normalizeCompanySlug(companySlug);
  return listingsSnapshot.filter((listing) => listing.companySlug === normalizedSlug);
}

export function getPublishedEmployerListings(companySlug: string): EmployerListing[] {
  return getEmployerListings(companySlug).filter((listing) => listing.status === "active");
}

export function findPublishedEmployerListing(publicId: string): EmployerListing | undefined {
  return listingsSnapshot.find(
    (listing) => listing.publicId === publicId && listing.status === "active",
  );
}

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  listingsSnapshot = readListings();
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new Event(LISTINGS_CHANGED_EVENT));
});
