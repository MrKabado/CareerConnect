import { employerRegistrationApi } from "@/features/employer-registration/api";
import {
  getEmployerListings,
  getPublishedEmployerListings,
  saveEmployerListings,
  type EmployerListing,
} from "@/features/employer-listings/listings";

export type CompanyHiringDefaults = {
  title: string;
  department: string;
  location: string;
  workspace: string;
  schoolPartnerships: string;
  acceptedCourses: string;
};

export type CompanyProfile = {
  id: string;
  name: string;
  initials: string;
  location: string;
  industry: string;
  teamSize: string;
  rating: string;
  verified: boolean;
  recommended: boolean;
  overview: string;
  cultureSummary?: string;
  tagline?: string;
  logoUrl?: string;
  founded?: string;
  benefits?: string[];
  locations?: Array<{ city: string; label: string }>;
  hiringDefaults?: CompanyHiringDefaults;
  website?: string;
  hiringEmail?: string;
  contactNumber?: string;
  highlights: string[];
  applicationProcess: string[];
  lifeAt: Array<{ icon: "impact" | "learn" | "belong"; title: string; description: string }>;
  openRoles: Array<{
    id: string;
    title: string;
    category: string;
    department?: string;
    location: string;
    type: "Job" | "OJT";
    arrangement: string;
    salary: string;
    description: string;
    skills: string[];
    responsibilities?: string[];
    schoolPartnerships?: string;
  }>;
};

export type EditableCompanyProfile = Pick<
  CompanyProfile,
  | "name"
  | "initials"
  | "logoUrl"
  | "industry"
  | "location"
  | "overview"
  | "cultureSummary"
  | "teamSize"
  | "highlights"
  | "applicationProcess"
  | "lifeAt"
  | "openRoles"
> & {
  tagline: string;
  cultureSummary: string;
  logoUrl: string;
  founded: string;
  benefits: string[];
  locations: Array<{ city: string; label: string }>;
  website: string;
  hiringEmail: string;
  contactNumber: string;
  hiringDefaults: CompanyHiringDefaults;
};

const PROFILE_OVERRIDES_KEY = "careerconnect.company-profile-overrides.v1";
const profileListeners = new Set<() => void>();

type SavedCompanyProfile = Partial<EditableCompanyProfile> & Pick<
  EditableCompanyProfile,
  "industry" | "location" | "overview" | "teamSize"
>;

function isEditableCompanyProfile(value: unknown): value is SavedCompanyProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<SavedCompanyProfile>;
  return (
    typeof profile.industry === "string" &&
    typeof profile.location === "string" &&
    typeof profile.overview === "string" &&
    typeof profile.teamSize === "string" &&
    (profile.cultureSummary === undefined || typeof profile.cultureSummary === "string") &&
    (profile.name === undefined || typeof profile.name === "string") &&
    (profile.initials === undefined || typeof profile.initials === "string") &&
    (profile.tagline === undefined || typeof profile.tagline === "string") &&
    (profile.logoUrl === undefined || typeof profile.logoUrl === "string") &&
    (profile.founded === undefined || typeof profile.founded === "string") &&
    (profile.benefits === undefined || (Array.isArray(profile.benefits) && profile.benefits.every((item) => typeof item === "string"))) &&
    (profile.locations === undefined || (Array.isArray(profile.locations) && profile.locations.every((item) => item && typeof item.city === "string" && typeof item.label === "string"))) &&
    (profile.hiringDefaults === undefined || (profile.hiringDefaults !== null && typeof profile.hiringDefaults === "object" && ["title", "department", "location", "workspace", "schoolPartnerships", "acceptedCourses"].every((key) => typeof profile.hiringDefaults?.[key as keyof typeof profile.hiringDefaults] === "string"))) &&
    (profile.website === undefined || typeof profile.website === "string") &&
    (profile.hiringEmail === undefined || typeof profile.hiringEmail === "string") &&
    (profile.contactNumber === undefined || typeof profile.contactNumber === "string") &&
    (profile.highlights === undefined || (Array.isArray(profile.highlights) && profile.highlights.every((item) => typeof item === "string"))) &&
    (profile.applicationProcess === undefined || (Array.isArray(profile.applicationProcess) && profile.applicationProcess.every((item) => typeof item === "string"))) &&
    (profile.lifeAt === undefined || (Array.isArray(profile.lifeAt) && profile.lifeAt.every((item) =>
      item && ["impact", "learn", "belong"].includes(item.icon) &&
      typeof item.title === "string" && typeof item.description === "string",
    ))) &&
    (profile.openRoles === undefined || (Array.isArray(profile.openRoles) && profile.openRoles.every((role) =>
      role && ["id", "title", "category", "location", "type", "arrangement", "salary", "description", "skills"]
        .every((key) => key in role) &&
      ["id", "title", "category", "location", "type", "arrangement", "salary", "description"]
        .every((key) => typeof role[key as keyof typeof role] === "string") &&
        Array.isArray(role.skills) && role.skills.every((skill) => typeof skill === "string") &&
        (role.department === undefined || typeof role.department === "string") &&
        (role.responsibilities === undefined || (Array.isArray(role.responsibilities) && role.responsibilities.every((item) => typeof item === "string"))) &&
        (role.schoolPartnerships === undefined || typeof role.schoolPartnerships === "string"),
    )))
  );
}

function readProfileOverrides(): Record<string, SavedCompanyProfile> {
  const serialized = localStorage.getItem(PROFILE_OVERRIDES_KEY);
  if (!serialized) return {};

  const parsed: unknown = JSON.parse(serialized);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved company profiles are invalid.");
  }

  const overrides: Record<string, SavedCompanyProfile> = {};
  for (const [slug, value] of Object.entries(parsed)) {
    if (!isEditableCompanyProfile(value)) {
      throw new Error("Saved company profile data is invalid.");
    }
    overrides[slug] = value;
  }
  return overrides;
}

let profileOverrides = readProfileOverrides();

export function subscribeCompanyProfiles(listener: () => void): () => void {
  profileListeners.add(listener);
  return () => profileListeners.delete(listener);
}

window.addEventListener("storage", (event) => {
  if (event.key !== PROFILE_OVERRIDES_KEY) return;
  profileOverrides = readProfileOverrides();
  profileListeners.forEach((listener) => listener());
});
window.addEventListener("careerconnect:employer-listings-changed", () => {
  profileOverrides = { ...profileOverrides };
  profileListeners.forEach((listener) => listener());
});

export function getCompanyProfileOverrides(): Record<string, SavedCompanyProfile> {
  return profileOverrides;
}

function syncProfileRolesToListings(
  slug: string,
  roles: EditableCompanyProfile["openRoles"],
): void {
  const existingListings = getEmployerListings(slug);
  if (!existingListings.length && !roles.length) return;

  const syncedListings: EmployerListing[] = [];
  const retainedListingIds = new Set<string>();

  for (const role of roles) {
    const existing = existingListings.find(
      (listing) => listing.publicId === role.id || listing.id === role.id,
    );
    if (existing) {
      retainedListingIds.add(existing.id);
      syncedListings.push({
        ...existing,
        title: role.title,
        type: role.type,
        category: role.category,
        department: role.department ?? role.category,
        location: role.location,
        salary: role.salary,
        description: role.description,
        responsibilities: role.responsibilities ?? existing.responsibilities,
        skills: [...role.skills],
        hiring: {
          ...existing.hiring,
          type: role.type === "OJT" ? "OJT" : existing.hiring.type,
          schedule: role.arrangement,
          schoolPartnerships: role.schoolPartnerships ?? existing.hiring.schoolPartnerships,
          workspace: role.location,
        },
      });
      continue;
    }

    const listingId = `${slug}:${role.id}`;
    retainedListingIds.add(listingId);
    syncedListings.push({
      id: listingId,
      publicId: role.id,
      companySlug: slug,
      title: role.title,
      type: role.type,
      category: role.category,
      location: role.location,
      department: role.department ?? role.category,
      applicants: 0,
      shortlisted: 0,
      status: "draft",
      updated: "Draft saved from company profile",
      description: role.description,
      responsibilities: role.responsibilities ?? [],
      salary: role.salary,
      skills: [...role.skills],
      hiring: {
        type: role.type === "OJT" ? "OJT" : role.type,
        schedule: role.arrangement,
        schoolPartnerships: role.schoolPartnerships ?? "Open to relevant students and graduates.",
        workspace: role.location,
      },
    });
  }

  for (const listing of existingListings) {
    if (listing.status === "active" && !retainedListingIds.has(listing.id)) {
      syncedListings.push({ ...listing, status: "closed" });
    }
  }

  saveEmployerListings(syncedListings);
}

export function updateCompanyProfile(
  slug: string,
  profile: EditableCompanyProfile,
): void {
  syncProfileRolesToListings(slug, profile.openRoles);
  const nextOverrides = { ...profileOverrides, [slug]: profile };
  localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(nextOverrides));
  profileOverrides = nextOverrides;
  profileListeners.forEach((listener) => listener());
}

export function toEditableCompanyProfile(profile: CompanyProfile): EditableCompanyProfile {
  return {
    name: profile.name,
    initials: profile.initials,
    tagline: profile.tagline ?? "",
    cultureSummary: profile.cultureSummary ?? "",
    logoUrl: profile.logoUrl ?? "",
    location: profile.location,
    industry: profile.industry,
    teamSize: profile.teamSize,
    founded: profile.founded ?? "",
    overview: profile.overview,
    highlights: [...profile.highlights],
    applicationProcess: [...profile.applicationProcess],
    lifeAt: profile.lifeAt.map((item) => ({ ...item })),
    openRoles: profile.openRoles.map((role) => ({ ...role, skills: [...role.skills] })),
    benefits: [...(profile.benefits ?? [])],
    locations: profile.locations?.map((location) => ({ ...location })) ?? [],
    hiringDefaults: profile.hiringDefaults ?? {
      title: profile.openRoles[0]?.title ?? "",
      department: profile.openRoles[0]?.department ?? profile.openRoles[0]?.category ?? "",
      location: profile.openRoles[0]?.location ?? profile.location,
      workspace: profile.openRoles[0]?.arrangement ?? "",
      schoolPartnerships: profile.openRoles[0]?.schoolPartnerships ?? "",
      acceptedCourses: "",
    },
    website: profile.website ?? "",
    hiringEmail: profile.hiringEmail ?? "",
    contactNumber: profile.contactNumber ?? "",
  };
}

export function getCompanyProfileSlug(companyName: string) {
  return companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getCompanyProfile(companyName: string): CompanyProfile {
  const slug = getCompanyProfileSlug(companyName);
  return getCompanyProfileBySlug(slug);
}

export function getCompanyProfileBySlug(
  slug: string,
): CompanyProfile {
  const normalizedSlug = getCompanyProfileSlug(slug);
  const storedEntry = Object.entries(profileOverrides).find(([savedSlug, savedProfile]) =>
    savedSlug === normalizedSlug ||
    (savedProfile.name && getCompanyProfileSlug(savedProfile.name) === normalizedSlug),
  );
  const baseSlug = storedEntry?.[0] ?? normalizedSlug;
  const storedProfile = storedEntry?.[1];
  const registeredEmployer = employerRegistrationApi.getSnapshot();
  const employerMatches =
    registeredEmployer &&
    getCompanyProfileSlug(registeredEmployer.companyName) === baseSlug;
  const employerListings = getEmployerListings(baseSlug);
  const isEmployerCompany =
    Boolean(employerMatches) || Boolean(storedProfile) || employerListings.length > 0;
  const publishedRoles = getPublishedEmployerListings(baseSlug).map((listing) => ({
    id: listing.publicId,
    title: listing.title,
    category: listing.category,
    department: listing.department,
    location: listing.location,
    type: listing.type,
    arrangement: listing.hiring.schedule,
    salary: listing.salary,
    description: listing.description,
    skills: [...listing.skills],
    responsibilities: [...listing.responsibilities],
    schoolPartnerships: listing.hiring.schoolPartnerships,
  }));

  const name = normalizedSlug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word[0].toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");

  return {
    id: normalizedSlug,
    name: storedProfile?.name ?? (employerMatches ? registeredEmployer.companyName : name),
    initials: storedProfile?.initials ?? ((storedProfile?.name ?? name).slice(0, 1) || "?"),
    location: storedProfile?.location ?? "Not provided",
    industry: storedProfile?.industry ?? (employerMatches ? registeredEmployer.industry : "Not provided"),
    teamSize: storedProfile?.teamSize ?? (employerMatches ? registeredEmployer.companySize : "Not provided"),
    rating: "Not provided",
    verified: false,
    recommended: false,
    overview: storedProfile?.overview ?? "",
    tagline: storedProfile?.tagline ?? "",
    logoUrl: storedProfile?.logoUrl ?? "",
    founded: storedProfile?.founded ?? "",
    highlights: storedProfile?.highlights ?? [],
    applicationProcess: storedProfile?.applicationProcess ?? [],
    lifeAt: storedProfile?.lifeAt ?? [],
    openRoles: isEmployerCompany
      ? publishedRoles
      : storedProfile?.openRoles ?? [],
    benefits: storedProfile?.benefits ?? [],
    locations: storedProfile?.locations ?? [],
    website: storedProfile?.website ?? "",
    hiringEmail: storedProfile?.hiringEmail ?? "",
    contactNumber: storedProfile?.contactNumber ?? "",
  };
}

export function getCompanyProfileUrl(companyName: string) {
  return `/company/${encodeURIComponent(getCompanyProfileSlug(companyName))}`;
}
