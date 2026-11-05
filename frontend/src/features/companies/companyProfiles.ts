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
    locations: profile.locations?.map((location) => ({ ...location })) ?? [
      { city: profile.location, label: "Primary hub" },
    ],
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

export const companyProfiles: Record<string, CompanyProfile> = {
  "maya-philippines": {
    id: "maya-philippines",
    name: "Maya Philippines",
    initials: "M",
    location: "BGC, Taguig City",
    industry: "Financial Technology",
    teamSize: "1,000+",
    rating: "4.7",
    verified: true,
    recommended: true,
    tagline: "Powering the digital economy for every Filipino",
    logoUrl: "/maya-logo.svg",
    founded: "2014",
    benefits: [
      "Competitive compensation",
      "Health and wellness coverage",
      "Performance incentives",
      "Hybrid work options",
      "Learning and development",
      "Employee perks",
    ],
    locations: [
      { city: "BGC, Taguig City", label: "Primary hub" },
      { city: "Makati City", label: "Regional office" },
      { city: "Quezon City", label: "Operations hub" },
    ],
    hiringDefaults: {
      title: "Frontend Developer",
      department: "Product",
      location: "BGC, Taguig City",
      workspace: "Hybrid",
      schoolPartnerships: "Open to software engineering students and graduates.",
      acceptedCourses: "Computer Science, Information Technology, Software Engineering",
    },
    website: "www.maya.ph",
    hiringEmail: "careers@maya.ph",
    contactNumber: "+63 2 8123 7788",
    overview:
      "Maya is the Philippines’ all-in-one money platform, combining digital banking, payments, and commerce tools to make financial services more accessible for every Filipino.",
    cultureSummary:
      "Maya's culture supports continuous learning, inclusive collaboration, and flexible ways of working while teams build financial products with meaningful impact.",
    highlights: [
      "Your fintech skills match current openings",
      "Hybrid setup matches your preference",
      "Located in your preferred work area",
    ],
    applicationProcess: [
      "Submit your profile",
      "Recruiter review",
      "Interview with the team",
      "Offer decision",
    ],
    lifeAt: [
      { icon: "impact", title: "Build for impact", description: "Create products used by millions." },
      { icon: "learn", title: "Keep learning", description: "Grow through mentorship and training." },
      { icon: "belong", title: "Belong here", description: "Bring your perspective to an inclusive team." },
    ],
    openRoles: [
      {
        id: "frontend",
        title: "Frontend Developer",
        category: "Digital Banking",
        location: "BGC, Taguig City",
        type: "Job",
        arrangement: "Hybrid",
        salary: "₱70,000–₱100,000",
        description: "Build secure, accessible digital banking experiences with Maya’s product and design teams.",
        skills: ["React", "TypeScript", "Design systems"],
      },
      {
        id: "software-engineering-intern",
        title: "Software Engineering Intern",
        category: "Platform Engineering",
        location: "BGC, Taguig City",
        type: "OJT",
        arrangement: "Hybrid",
        salary: "Paid · 480 hours",
        description: "Join a mentor-led engineering squad while completing your required internship hours.",
        skills: ["JavaScript", "Git", "MOA supported"],
      },
      {
        id: "customer-experience",
        title: "Customer Experience Specialist",
        category: "Customer Operations",
        location: "Quezon City",
        type: "Job",
        arrangement: "On-site",
        salary: "Competitive salary",
        description: "Help customers resolve account and payment concerns with thoughtful, efficient support.",
        skills: ["Customer support", "Communication", "Fintech"],
      },
    ],
  },
  "northstar-labs": {
    id: "northstar-labs",
    name: "Northstar Labs",
    initials: "N",
    location: "San Francisco, CA",
    industry: "Design & Creative",
    teamSize: "201-500 employees",
    rating: "4.8",
    verified: true,
    recommended: true,
    overview:
      "Northstar Labs partners with product teams to build thoughtful, flexible systems and enable brands to create confident digital experiences. Their work spans UX research, product strategy, and scalable design systems.",
    highlights: [
      "Your design skills match current openings",
      "Remote-first setup supports your preference",
      "A collaborative, distributed team",
    ],
    applicationProcess: ["Submit your profile", "Portfolio review", "Team interview", "Offer decision"],
    lifeAt: [
      { icon: "impact", title: "Design with purpose", description: "Shape products used by modern teams." },
      { icon: "learn", title: "Grow together", description: "Learn through critique and mentorship." },
      { icon: "belong", title: "Work openly", description: "Collaborate with a distributed team." },
    ],
    openRoles: [
      {
        id: "product",
        title: "Senior Product Designer",
        category: "Product Design",
        location: "San Francisco, CA",
        type: "Job",
        arrangement: "Remote",
        salary: "$115,000–$145,000",
        description: "Shape intuitive experiences for teams doing their best work in a distributed environment.",
        skills: ["Product design", "Design systems", "Figma"],
      },
    ],
  },
  "vela-health": {
    id: "vela-health",
    name: "Vela Health",
    initials: "V",
    location: "Remote · United States",
    industry: "Healthcare",
    teamSize: "101-250 employees",
    rating: "4.6",
    verified: true,
    recommended: true,
    overview:
      "Vela Health helps people navigate care with digital tools that combine compassionate support and data-backed decision making. The team works across research, product, and operations to build a healthier, more accessible patient experience.",
    highlights: [
      "Your research skills match current openings",
      "Remote work available across the United States",
      "A team focused on accessible care",
    ],
    applicationProcess: ["Submit your profile", "Recruiter review", "Research interview", "Offer decision"],
    lifeAt: [
      { icon: "impact", title: "Improve care", description: "Build experiences with real-world impact." },
      { icon: "learn", title: "Keep exploring", description: "Turn research into better decisions." },
      { icon: "belong", title: "Care together", description: "Work with an empathetic, inclusive team." },
    ],
    openRoles: [
      {
        id: "research",
        title: "UX Researcher",
        category: "Research",
        location: "Remote · United States",
        type: "Job",
        arrangement: "Remote",
        salary: "$90,000–$120,000",
        description: "Turn human insight into meaningful product direction for a growing digital health platform.",
        skills: ["Research", "Healthcare", "Remote"],
      },
    ],
  },
  "kindred-finance": {
    id: "kindred-finance",
    name: "Kindred Finance",
    initials: "K",
    location: "New York, NY",
    industry: "Information Technology",
    teamSize: "251-500 employees",
    rating: "4.5",
    verified: true,
    recommended: false,
    overview:
      "Kindred Finance is building intuitive financial infrastructure for both consumers and businesses that want greater transparency and confidence in their decisions. Their platform blends product strategy, engineering, and service design into cohesive offerings.",
    highlights: [
      "Your frontend skills match current openings",
      "Hybrid setup in New York",
      "A close-knit product and design team",
    ],
    applicationProcess: ["Submit your profile", "Recruiter review", "Engineering interview", "Offer decision"],
    lifeAt: [
      { icon: "impact", title: "Build with trust", description: "Make finance clearer and more accessible." },
      { icon: "learn", title: "Keep improving", description: "Grow with thoughtful product feedback." },
      { icon: "belong", title: "Work as one", description: "Partner closely across product and design." },
    ],
    openRoles: [
      {
        id: "engineer",
        title: "Frontend Engineer",
        category: "Digital Products",
        location: "New York, NY",
        type: "Job",
        arrangement: "Hybrid",
        salary: "$110,000–$135,000",
        description: "Build accessible, high-quality interfaces with a close-knit product and design team.",
        skills: ["Frontend", "React", "Accessibility"],
      },
    ],
  },
  "common-ground": {
    id: "common-ground",
    name: "Common Ground",
    initials: "C",
    location: "Taguig City",
    industry: "Human Resources",
    teamSize: "51-200",
    rating: "4.6",
    verified: true,
    recommended: false,
    overview:
      "Common Ground creates people-first workplaces and employee experiences, helping teams build healthier, more supportive organizations.",
    highlights: [
      "Your people-focused training aligns with this OJT",
      "Located in your preferred work area",
      "Mentorship and hands-on HR experience",
    ],
    applicationProcess: ["Submit your profile", "Recruiter review", "Meet your mentor", "OJT placement decision"],
    lifeAt: [
      { icon: "impact", title: "Support people", description: "Help create a better employee experience." },
      { icon: "learn", title: "Learn by doing", description: "Build practical HR and operations skills." },
      { icon: "belong", title: "Find your team", description: "Join a supportive, people-first workplace." },
    ],
    openRoles: [
      {
        id: "people-operations-intern",
        title: "People Operations Intern",
        category: "Human Resources",
        location: "Taguig City",
        type: "OJT",
        arrangement: "On-site",
        salary: "₱12,000–₱15,000 / month",
        description: "Support a people-first employee experience while learning modern HR operations.",
        skills: ["People ops", "Learning", "Internship"],
      },
    ],
  },
  "canva-philippines": {
    id: "canva-philippines",
    name: "Canva Philippines",
    initials: "C",
    location: "Makati City, Metro Manila",
    industry: "Technology & Design",
    teamSize: "1,000+ in PH",
    rating: "Not provided",
    verified: false,
    recommended: false,
    overview:
      "Canva is a global visual communication platform. Its Philippines team has more than 1,000 people and includes Design, Customer Happiness, Sales, People, and Operations teams based around its Makati campus.",
    highlights: [
      "Canva's official careers page lists a campus in Makati City",
      "The Philippines team has more than 1,000 members",
      "Canva has local Design teams in the Philippines",
    ],
    applicationProcess: [
      "Application steps were not provided for this internship.",
    ],
    lifeAt: [
      {
        icon: "impact",
        title: "Empower people to design",
        description: "Contribute to a global visual communication platform.",
      },
      {
        icon: "learn",
        title: "Work across design teams",
        description: "Canva's Philippine teams include local designers.",
      },
      {
        icon: "belong",
        title: "Join the Makati campus",
        description: "Canva's official careers site lists its Philippine campus in Makati City.",
      },
    ],
    openRoles: [
      {
        id: "canva-product-design-intern",
        title: "Product Design Intern",
        category: "Product Design",
        location: "Makati City, Metro Manila",
        type: "OJT",
        arrangement: "Not provided",
        salary: "Not provided",
        description:
          "Product Design Intern opportunity with Canva Philippines. Further role-specific details were not provided.",
        skills: [],
      },
    ],
  },
};

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

export function getCompanyProfile(companyName: string) {
  const slug = getCompanyProfileSlug(companyName);
  return getCompanyProfileBySlug(slug);
}

export function getCompanyProfileBySlug(
  slug: string,
) {
  const normalizedSlug = getCompanyProfileSlug(slug);
  const storedEntry = Object.entries(profileOverrides).find(([savedSlug, savedProfile]) =>
    savedSlug === normalizedSlug ||
    (savedProfile.name && getCompanyProfileSlug(savedProfile.name) === normalizedSlug),
  );
  const baseSlug = storedEntry?.[0] ?? normalizedSlug;
  const knownProfile = companyProfiles[normalizedSlug] ?? companyProfiles[baseSlug];
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

  if (knownProfile) {
    return {
      ...knownProfile,
      ...(employerMatches
        ? {
            name: registeredEmployer.companyName,
            initials: registeredEmployer.companyName.slice(0, 1).toUpperCase(),
            industry: registeredEmployer.industry,
            teamSize: registeredEmployer.companySize,
          }
        : {}),
      ...(storedProfile ?? {}),
      ...(employerMatches
        ? {
            name: storedProfile?.name ?? registeredEmployer.companyName,
            initials: storedProfile?.initials ?? (storedProfile?.name ?? registeredEmployer.companyName).slice(0, 1).toUpperCase(),
          }
        : {}),
      ...(isEmployerCompany ? { openRoles: publishedRoles } : {}),
    };
  }

  const name = normalizedSlug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word[0].toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");

  return {
    id: normalizedSlug,
    name: storedProfile?.name ?? (employerMatches ? registeredEmployer.companyName : name),
    initials: storedProfile?.initials ?? ((storedProfile?.name ?? name).slice(0, 1) || "?"),
    location: storedProfile?.location ?? "Location not provided",
    industry: storedProfile?.industry ?? (employerMatches ? registeredEmployer.industry : "General"),
    teamSize: storedProfile?.teamSize ?? (employerMatches ? registeredEmployer.companySize : "Not provided"),
    rating: "New",
    verified: false,
    recommended: false,
    overview: storedProfile?.overview ?? `${name} is sharing opportunities with the CareerConnect community. Visit this page to learn about open roles and the team.`,
    tagline: storedProfile?.tagline ?? "",
    logoUrl: storedProfile?.logoUrl ?? "",
    founded: storedProfile?.founded ?? "",
    highlights: storedProfile?.highlights ?? ["Explore the open role", "Check the work setup and location", "Review the application requirements"],
    applicationProcess: storedProfile?.applicationProcess ?? ["Submit your profile", "Recruiter review", "Interview with the team", "Offer decision"],
    lifeAt: storedProfile?.lifeAt ?? [
      { icon: "impact" as const, title: "Make an impact", description: "Contribute to meaningful work." },
      { icon: "learn" as const, title: "Keep learning", description: "Build skills through hands-on experience." },
      { icon: "belong" as const, title: "Work together", description: "Collaborate with a supportive team." },
    ],
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
