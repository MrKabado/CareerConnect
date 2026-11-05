export type EmployerListingStatus = "active" | "draft" | "closed";

export type EmployerListing = {
  id: string;
  publicId: string;
  companySlug: string;
  title: string;
  type: "Job" | "OJT";
  category: string;
  location: string;
  department: string;
  applicants: number;
  shortlisted: number;
  status: EmployerListingStatus;
  updated: string;
  description: string;
  responsibilities: string[];
  salary: string;
  skills: string[];
  hiring: {
    type: string;
    schedule: string;
    schoolPartnerships: string;
    workspace: string;
  };
};

const STORAGE_KEY = "careerconnect.employer-listings.records.v1";
const LISTINGS_CHANGED_EVENT = "careerconnect:employer-listings-changed";

const mayaCompanySlug = "maya-philippines";

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
const defaultListings: EmployerListing[] = [
  {
    id: "frontend-developer",
    publicId: "frontend",
    companySlug: mayaCompanySlug,
    title: "Frontend Developer",
    type: "Job",
    category: "Digital Banking",
    location: "BGC, Taguig City",
    department: "Product",
    applicants: 48,
    shortlisted: 9,
    status: "active",
    updated: "Updated today by 9:42 AM",
    description: "Build secure, accessible digital banking experiences used by customers across the Philippines.",
    responsibilities: [
      "Ship polished web experiences for customer-facing banking journeys.",
      "Collaborate with design and product to improve usability and accessibility.",
      "Maintain a high-quality frontend architecture with reusable components.",
    ],
    salary: "₱70,000–₱100,000",
    skills: ["React", "TypeScript", "Design systems"],
    hiring: {
      type: "Full-time",
      schedule: "Hybrid",
      schoolPartnerships: "Open to software engineering students and graduates.",
      workspace: "BGC, Taguig City",
    },
  },
  {
    id: "software-engineer",
    publicId: "software-engineering-intern",
    companySlug: mayaCompanySlug,
    title: "Software Engineer",
    type: "OJT",
    category: "Digital Banking",
    location: "BGC, Taguig City",
    department: "Engineering",
    applicants: 31,
    shortlisted: 7,
    status: "active",
    updated: "Updated today by 10:18 AM",
    description: "Design, build, and improve the systems behind digital payments, fraud prevention, and customer tools.",
    responsibilities: [
      "Develop backend services and internal tooling for payment experiences.",
      "Support engineering quality with tests and documentation.",
      "Work with peers to improve product reliability across teams.",
    ],
    salary: "Paid · 480 hours",
    skills: ["JavaScript", "Git", "MOA supported"],
    hiring: {
      type: "OJT",
      schedule: "Hybrid",
      schoolPartnerships: "Open to software engineering students and graduates.",
      workspace: "BGC, Taguig City",
    },
  },
  {
    id: "customer-experience-specialist",
    publicId: "customer-experience",
    companySlug: mayaCompanySlug,
    title: "Customer Experience Specialist",
    type: "Job",
    category: "Customer Support",
    location: "Quezon City",
    department: "Operations",
    applicants: 27,
    shortlisted: 5,
    status: "active",
    updated: "Updated today by 11:25 AM",
    description: "Support customers and partners with compassionate, high-quality experiences across digital and assisted channels.",
    responsibilities: [
      "Resolve customer issues with empathy and speed.",
      "Document recurring issues and improve knowledge resources.",
      "Coordinate with internal teams on customer feedback and trends.",
    ],
    salary: "Competitive salary",
    skills: ["Customer support", "Communication", "Fintech"],
    hiring: {
      type: "Full-time",
      schedule: "On-site",
      schoolPartnerships: "Open to customer support and communications graduates.",
      workspace: "Quezon City",
    },
  },
  {
    id: "product-designer",
    publicId: "product-designer",
    companySlug: mayaCompanySlug,
    title: "Product Designer",
    type: "Job",
    category: "Design",
    location: "Remote",
    department: "Design",
    applicants: 12,
    shortlisted: 4,
    status: "draft",
    updated: "Draft saved 2 hours ago",
    description: "Lead discovery and design for customer journeys across mobile and web experiences.",
    responsibilities: [
      "Translate product goals into elegant user experiences.",
      "Create prototypes and validate design assumptions with users.",
      "Work closely with stakeholders across product, engineering, and marketing.",
    ],
    salary: "Competitive salary",
    skills: ["Product design", "Figma"],
    hiring: {
      type: "Full-time",
      schedule: "Remote",
      schoolPartnerships: "Open to design students and recent graduates.",
      workspace: "Remote",
    },
  },
  {
    id: "finance-operations-trainee",
    publicId: "finance-operations-trainee",
    companySlug: mayaCompanySlug,
    title: "Finance Operations Trainee",
    type: "OJT",
    category: "Operations",
    location: "Makati City",
    department: "Finance",
    applicants: 14,
    shortlisted: 3,
    status: "draft",
    updated: "Draft saved 3 hours ago",
    description: "Support finance operations workflows, reporting, and process improvements across internal teams.",
    responsibilities: [
      "Prepare reconciliations and operational reports.",
      "Assist with vendor and payment administration work.",
      "Identify process gaps and support continuous improvement.",
    ],
    salary: "Paid internship",
    skills: ["Finance", "Accounting"],
    hiring: {
      type: "OJT",
      schedule: "On-site",
      schoolPartnerships: "Open to finance, accounting, and business students.",
      workspace: "Makati City",
    },
  },
  {
    id: "data-analyst",
    publicId: "data-analyst",
    companySlug: mayaCompanySlug,
    title: "Data Analyst",
    type: "Job",
    category: "Analytics",
    location: "Remote",
    department: "Analytics",
    applicants: 64,
    shortlisted: 11,
    status: "active",
    updated: "Updated yesterday by 5:14 PM",
    description: "Turn data into meaningful insight and help teams make faster, smarter product and operations decisions.",
    responsibilities: [
      "Create dashboards that support business and product decisions.",
      "Identify trends through SQL, experimentation, and analysis.",
      "Partner with teams to improve how the company measures outcomes.",
    ],
    salary: "Competitive salary",
    skills: ["SQL", "Analytics", "Data visualization"],
    hiring: {
      type: "Full-time",
      schedule: "Remote",
      schoolPartnerships: "Open to analytics, business, and computer science graduates.",
      workspace: "Remote",
    },
  },
];

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
  if (!serialized) return defaultListings;

  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed) || !parsed.every(isEmployerListing)) {
    throw new Error("Saved employer listings are invalid.");
  }
  return parsed;
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
