import { useMemo, useState } from "react";

type ListingStatus = "active" | "draft" | "closed";

type Listing = {
  id: string;
  title: string;
  type: "Job" | "OJT";
  category: string;
  location: string;
  department: string;
  applicants: number;
  shortlisted: number;
  status: ListingStatus;
  updated: string;
  description: string;
  responsibilities: string[];
  hiring: {
    type: string;
    schedule: string;
    schoolPartnerships: string;
    workspace: string;
  };
};

const listings: Listing[] = [
  {
    id: "frontend-developer",
    title: "Frontend Developer",
    type: "Job",
    category: "Digital Banking",
    location: "BGC, Taguig City",
    department: "Product",
    applicants: 48,
    shortlisted: 9,
    status: "active",
    updated: "Updated today by 9:42 AM",
    description:
      "Build secure, accessible digital banking experiences used by customers across the Philippines.",
    responsibilities: [
      "Ship polished web experiences for customer-facing banking journeys.",
      "Collaborate with design and product to improve usability and accessibility.",
      "Maintain a high-quality frontend architecture with reusable components.",
    ],
    hiring: {
      type: "Full-time",
      schedule: "Hybrid",
      schoolPartnerships: "Open to software engineering students and graduates.",
      workspace: "BGC, Taguig City",
    },
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    type: "OJT",
    category: "Digital Banking",
    location: "BGC, Taguig City",
    department: "Engineering",
    applicants: 31,
    shortlisted: 7,
    status: "active",
    updated: "Updated today by 10:18 AM",
    description:
      "Design, build, and improve the systems behind digital payments, fraud prevention, and customer tools.",
    responsibilities: [
      "Develop backend services and internal tooling for payment experiences.",
      "Support engineering quality with tests and documentation.",
      "Work with peers to improve product reliability across teams.",
    ],
    hiring: {
      type: "OJT",
      schedule: "Hybrid",
      schoolPartnerships: "Open to software engineering students and graduates.",
      workspace: "BGC, Taguig City",
    },
  },
  {
    id: "customer-experience-specialist",
    title: "Customer Experience Specialist",
    type: "Job",
    category: "Customer Support",
    location: "Quezon City",
    department: "Operations",
    applicants: 27,
    shortlisted: 5,
    status: "active",
    updated: "Updated today by 11:25 AM",
    description:
      "Support customers and partners with compassionate, high-quality experiences across digital and assisted channels.",
    responsibilities: [
      "Resolve customer issues with empathy and speed.",
      "Document recurring issues and improve knowledge resources.",
      "Coordinate with internal teams on customer feedback and trends.",
    ],
    hiring: {
      type: "Full-time",
      schedule: "On-site",
      schoolPartnerships: "Open to customer support and communications graduates.",
      workspace: "Quezon City",
    },
  },
  {
    id: "product-designer",
    title: "Product Designer",
    type: "Job",
    category: "Design",
    location: "Remote",
    department: "Design",
    applicants: 12,
    shortlisted: 4,
    status: "draft",
    updated: "Draft saved 2 hours ago",
    description:
      "Lead discovery and design for customer journeys across mobile and web experiences.",
    responsibilities: [
      "Translate product goals into elegant user experiences.",
      "Create prototypes and validate design assumptions with users.",
      "Work closely with stakeholders across product, engineering, and marketing.",
    ],
    hiring: {
      type: "Full-time",
      schedule: "Remote",
      schoolPartnerships: "Open to design students and recent graduates.",
      workspace: "Remote",
    },
  },
  {
    id: "finance-operations-trainee",
    title: "Finance Operations Trainee",
    type: "OJT",
    category: "Operations",
    location: "Makati City",
    department: "Finance",
    applicants: 14,
    shortlisted: 3,
    status: "draft",
    updated: "Draft saved 3 hours ago",
    description:
      "Support finance operations workflows, reporting, and process improvements across internal teams.",
    responsibilities: [
      "Prepare reconciliations and operational reports.",
      "Assist with vendor and payment administration work.",
      "Identify process gaps and support continuous improvement.",
    ],
    hiring: {
      type: "OJT",
      schedule: "On-site",
      schoolPartnerships: "Open to finance, accounting, and business students.",
      workspace: "Makati City",
    },
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    type: "Job",
    category: "Analytics",
    location: "Remote",
    department: "Analytics",
    applicants: 64,
    shortlisted: 11,
    status: "active",
    updated: "Updated yesterday by 5:14 PM",
    description:
      "Turn data into meaningful insight and help teams make faster, smarter product and operations decisions.",
    responsibilities: [
      "Create dashboards that support business and product decisions.",
      "Identify trends through SQL, experimentation, and analysis.",
      "Partner with teams to improve how the company measures outcomes.",
    ],
    hiring: {
      type: "Full-time",
      schedule: "Remote",
      schoolPartnerships: "Open to analytics, business, and computer science graduates.",
      workspace: "Remote",
    },
  },
] as const;

const filterOptions = ["All statuses", "Jobs", "OJT"] as const;

function StatusPill({ status }: { status: ListingStatus }) {
  const styles = {
    active: "bg-[#ecf9f5] text-[#1d9d75] border border-[#d5f1e5]",
    draft: "bg-[#fff6df] text-[#bd8a12] border border-[#f6e6b6]",
    closed: "bg-[#fbe8e8] text-[#c65d5d] border border-[#f1c8c8]",
  } as const;

  const label = status === "active" ? "Active" : status === "draft" ? "Draft" : "Closed";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${styles[status]}`}>
      {label}
    </span>
  );
}

export default function EmployerJobListingPage() {
  const [selectedId, setSelectedId] = useState<string>(listings[0].id);
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>("All statuses");

  const visibleListings = useMemo(() => {
    if (filter === "Jobs") {
      return listings.filter((listing) => listing.type === "Job");
    }

    if (filter === "OJT") {
      return listings.filter((listing) => listing.type === "OJT");
    }

    return listings;
  }, [filter]);

  const selectedListing = visibleListings.find((listing) => listing.id === selectedId) ?? visibleListings[0] ?? listings[0];
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListingType, setNewListingType] = useState<"job" | "ojt" | null>(null);
  const [newListingStep, setNewListingStep] = useState<1 | 2>(1);
  const [newListingForm, setNewListingForm] = useState({
    title: "",
    department: "",
    location: "BGC, Taguig City",
    workSetup: "Hybrid",
    availableSlots: "6",
    requiredHours: "480",
    summary: "",
  });

  function openCreateModal() {
    setNewListingType(null);
    setNewListingStep(1);
    setNewListingForm({
      title: "",
      department: "",
      location: "BGC, Taguig City",
      workSetup: "Hybrid",
      availableSlots: "6",
      requiredHours: "480",
      summary: "",
    });
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setNewListingType(null);
    setNewListingStep(1);
  }

  function handleNewListingTypePick(type: "job" | "ojt") {
    setNewListingType(type);
    setNewListingStep(2);
  }

  function updateNewListingForm(field: keyof typeof newListingForm, value: string) {
    setNewListingForm((current) => ({ ...current, [field]: value }));
  }

  const modalTitle = newListingType === "ojt" ? "Create a new OJT opportunity" : "Create a new job";

  return (
    <div className="min-h-screen bg-[#edf3f2] text-[#243a3c]">
      <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-4 md:px-6 xl:px-0">
        <div className="overflow-hidden rounded-[18px] border border-[#e7efee] bg-[#f5f8f7] shadow-[0_12px_30px_rgba(27,54,52,0.08)]">
          <header className="flex items-center justify-between gap-4 border-b border-[#edf2f1] bg-white px-5 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0d8fa2] text-[17px] font-bold text-white shadow-[0_10px_20px_rgba(12,143,162,0.22)]">
                C
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold tracking-[-0.04em] text-[#1f3437]">
                  Career<span className="text-[#0d8fa2]">Connect</span>
                </span>
                <span className="rounded-full bg-[#edf6f5] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6d7b7b]">
                  Employer
                </span>
              </div>
            </div>

            <nav className="hidden items-center gap-7 text-sm md:flex" aria-label="Employer nav">
              {[
                { label: "Overview", active: false },
                { label: "Job Listings", active: true },
                { label: "Applicants", active: false },
              ].map(({ label, active }) => (
                <button
                  key={label}
                  type="button"
                  className={`relative pb-5 text-sm font-medium ${active ? "text-[#0e8e9b]" : "text-[#697e7f]"}`}
                >
                  {label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-0.5 h-[2.5px] rounded-full bg-[#0e8e9b]" />
                  )}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Notifications"
                className="grid h-9 w-9 place-items-center rounded-full border border-[#e5eeeb] bg-[#f4f7f6] text-[#627a7c] transition hover:border-[#d8e8e4] hover:text-[#224b52]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 17h5l-1.8-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 18a3 3 0 0 0 6 0" />
                </svg>
              </button>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dcefe8] text-[11px] font-bold text-[#1a6a63]">
                MP
              </div>
            </div>
          </header>

          <main className="bg-[#f5f8f7] px-4 py-5 md:px-6 md:py-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a7d7e]">
                  Maya Philippines
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-[-0.07em] text-[#1d3034] md:text-[2.2rem]">
                  Job Listings
                </h1>
                <p className="mt-2 text-sm text-[#697d7d]">
                  Create, review, and manage every Maya opportunity in one place.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]"
              >
                <span className="mr-2 text-base leading-none">＋</span>
                Create new listing
              </button>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Active listings", value: 3, detail: "Currently accepting applications", tone: "bg-[#eefaf5] text-[#178d6b]" },
                { label: "Drafts", value: 2, detail: "Waiting for review", tone: "bg-[#fff9eb] text-[#c28921]" },
                { label: "Total applicants", value: 170, detail: "Across all Maya listings", tone: "bg-[#edf5ff] text-[#3477d3]" },
                { label: "OJT slots", value: 10, detail: "Across internship programs", tone: "bg-[#edeefb] text-[#5c5ad9]" },
              ].map(({ label, value, detail, tone }) => (
                <div key={label} className="rounded-[18px] border border-[#e5eeeb] bg-white p-4 shadow-[0_8px_20px_rgba(27,54,52,0.03)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
                      <span className="h-2.5 w-2.5 rounded-full bg-current opacity-90" />
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7b8d8d]">Live</span>
                  </div>
                  <p className="mt-4 text-sm font-medium text-[#62757a]">{label}</p>
                  <p className="mt-2 text-[2rem] font-bold leading-none tracking-[-0.08em] text-[#1d3133]">{value}</p>
                  <p className="mt-3 border-t border-[#edf2f0] pt-3 text-[11px] text-[#6a7d7d]">{detail}</p>
                </div>
              ))}
            </section>

            <div className="mt-6 rounded-[18px] border border-[#e5eeeb] bg-white p-3 shadow-[0_10px_20px_rgba(27,54,52,0.03)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#758687]" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="8" cy="8" r="5" />
                    <path d="m12.5 12.5 5 5" />
                  </svg>
                  <input
                    aria-label="Search listings"
                    defaultValue=""
                    placeholder="Search title, department, or location"
                    className="w-full rounded-xl border border-[#e1eaeb] bg-[#f9fbfb] py-2.5 pl-10 pr-3 text-sm text-[#243a3c] placeholder:text-[#86999c] outline-none transition focus:border-[#b9dfe1] focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#dfe9e7] bg-[#f9fbfb] px-3 py-2 text-sm text-[#3f5d61]"
                  >
                    <span>All statuses</span>
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 7 5 5 5-5" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1 rounded-xl border border-[#dfe9e7] bg-[#f9fbfb] p-1">
                    {filterOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFilter(option)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          filter === option ? "bg-[#0e8e9b] text-white shadow-[0_6px_12px_rgba(14,142,155,0.2)]" : "text-[#587174]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
              <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#1d3034]">Maya opportunities</h2>
                    <p className="mt-1 text-[11px] text-[#738385]">{visibleListings.length} of {listings.length} listings</p>
                  </div>
                  <span className="text-[11px] font-medium text-[#6a7d7d]">Updated today</span>
                </div>

                <div className="space-y-3">
                  {visibleListings.map((listing) => {
                    const isSelected = listing.id === selectedListing.id;

                    return (
                      <div
                        key={listing.id}
                        className={`rounded-[16px] border p-3 transition ${
                          isSelected ? "border-[#cfe6ea] bg-[#f4fafb] shadow-[0_8px_18px_rgba(14,142,155,0.08)]" : "border-[#edf1f1] bg-[#fbfdfd]"
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dff4f4] text-[#167e88]">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M8 8h8M8 12h8M8 16h5" />
                              </svg>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-[15px] font-semibold text-[#1d3034]">{listing.title}</h3>
                                <span className="rounded-full bg-[#edf6f6] px-2 py-0.5 text-[9px] font-semibold text-[#43717a]">
                                  {listing.type}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-[#6c7d7d]">{listing.category}</p>
                              <p className="mt-1 text-[11px] text-[#7a8c8d]">{listing.location}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 md:pt-1">
                            <StatusPill status={listing.status} />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 border-t border-[#eef2f1] pt-3 text-[11px] text-[#64797b] sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-3">
                            <span>{listing.applicants} applicants</span>
                            <span>{listing.shortlisted} shortlisted</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedId(listing.id)}
                            className="inline-flex items-center justify-center rounded-full border border-[#dbe7e6] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0c808d] transition hover:border-[#cfe4e6] hover:bg-[#f3fbfc]"
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6d7d7d]">
                    {selectedListing.type}
                  </div>
                  <span className="text-[11px] text-[#738285]">{selectedListing.updated}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-bold tracking-[-0.05em] text-[#1e3135]">{selectedListing.title}</h3>
                    <p className="mt-1 text-[11px] text-[#697d7d]">{selectedListing.category}</p>
                  </div>
                  <StatusPill status={selectedListing.status} />
                </div>

                <div className="mt-4 grid gap-2 text-[11px] text-[#5f6f70]">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6faf9] px-3 py-2">
                    <span>Location</span>
                    <span className="font-medium text-[#1d3133]">{selectedListing.location}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6faf9] px-3 py-2">
                    <span>Schedule</span>
                    <span className="font-medium text-[#1d3133]">{selectedListing.hiring.schedule}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6faf9] px-3 py-2">
                    <span>Type</span>
                    <span className="font-medium text-[#1d3133]">{selectedListing.hiring.type}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-[16px] border border-[#e5eeeb] bg-[#fbfdfd] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62777a]">
                    About this role
                  </p>
                  <p className="mt-3 text-[12px] leading-5 text-[#495e60]">{selectedListing.description}</p>

                  <ul className="mt-4 space-y-2 text-[11px] leading-5 text-[#4d6366]">
                    {selectedListing.responsibilities.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0f909f]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 rounded-[16px] border border-[#dfeae9] bg-[#edf5f4] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d7071]">Maya hiring defaults</p>
                  <p className="mt-3 text-[11px] leading-5 text-[#4a5d5f]">
                    {selectedListing.hiring.schoolPartnerships}
                  </p>

                  <div className="mt-4 space-y-2 text-[11px] text-[#4d6264]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Hiring for</span>
                      <span className="font-medium text-[#1d3133]">{selectedListing.type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Default workspace</span>
                      <span className="font-medium text-[#1d3133]">{selectedListing.hiring.workspace}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>School partnerships</span>
                      <span className="font-medium text-[#1d3133]">Open</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]"
                >
                  Review onboarding
                </button>
              </aside>
            </section>
          </main>

          <footer className="border-t border-[#edf1f1] bg-white px-4 py-4 text-center text-[11px] font-medium text-[#7a8b8d]">
            © 2026 CareerConnect · Maya Philippines employer workspace
          </footer>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c4f53]/40 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-[680px] overflow-hidden rounded-[18px] border border-[#dfeae8] bg-[#f4f8f8] shadow-[0_30px_80px_rgba(24,48,51,0.22)]">
            <div className="flex items-center justify-between border-b border-[#edf2f0] bg-[#f7fbfa] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-[#dff4ef] text-[11px] font-bold text-[#0d8fa2]">
                  {newListingType ? "2" : "1"}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#688082]">
                  {newListingType ? `Step ${newListingStep} of 2` : "New listing"}
                </span>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="text-[11px] font-medium text-[#5c7174] transition hover:text-[#1e3437]"
              >
                Close
              </button>
            </div>

            <div className="px-5 pb-5 pt-4 text-[#1d3133]">
              {newListingStep === 1 ? (
                <>
                  <div className="mb-4">
                    <h2 className="text-[15px] font-bold tracking-[-0.04em] text-[#1d3133]">
                      What are you hiring for?
                    </h2>
                    <p className="mt-1 text-[11px] text-[#667a7d]">
                      Start with Maya Philippines' saved employer setup.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleNewListingTypePick("job")}
                      className={`rounded-[14px] border p-4 text-left transition ${
                        newListingType === "job"
                          ? "border-[#bfe5e7] bg-[#edf9fb] shadow-[0_12px_20px_rgba(14,142,155,0.08)]"
                          : "border-[#e1eaeb] bg-white hover:border-[#d1e7ea]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dff4f3] text-[#0f8e9b]">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M7 7h10v10H7z" />
                            <path d="M9 11h6M9 15h4" />
                          </svg>
                        </span>
                        {newListingType === "job" && (
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0e8e9b] text-[10px] font-bold text-white">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="text-[14px] font-semibold text-[#1d3133]">Full-time job</div>
                      <p className="mt-1 text-[11px] leading-5 text-[#607476]">
                        Use Maya&apos;s workplace and screening defaults.
                      </p>
                      <div className="mt-3 text-[10px] font-semibold text-[#0d8fa2]">Create a job →</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNewListingTypePick("ojt")}
                      className={`rounded-[14px] border p-4 text-left transition ${
                        newListingType === "ojt"
                          ? "border-[#bfe5e7] bg-[#edf9fb] shadow-[0_12px_20px_rgba(14,142,155,0.08)]"
                          : "border-[#e1eaeb] bg-white hover:border-[#d1e7ea]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff2d8] text-[#ae7d1a]">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2 4 7v6c0 4.3 2.8 8.1 8 9 5.2-.9 8-4.7 8-9V7l-8-5Z" />
                            <path d="M9.5 12.5 11 14l3.5-4" />
                          </svg>
                        </span>
                        {newListingType === "ojt" && (
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0e8e9b] text-[10px] font-bold text-white">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="text-[14px] font-semibold text-[#1d3133]">OJT opportunity</div>
                      <p className="mt-1 text-[11px] leading-5 text-[#607476]">
                        Include MDA support, required hours, and school programs.
                      </p>
                      <div className="mt-3 text-[10px] font-semibold text-[#0d8fa2]">Create an OJT listing →</div>
                    </button>
                  </div>

                  <div className="mt-4 rounded-[12px] border border-[#dfeae8] bg-[#eef7f6] p-3 text-[10px] leading-5 text-[#4d676a]">
                    Maya&apos;s job posting workflow uses your company default setup. You can review everything before publishing.
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <h2 className="text-[15px] font-bold tracking-[-0.04em] text-[#1d3133]">
                      {modalTitle}
                    </h2>
                    <p className="mt-1 text-[11px] text-[#677c7d]">
                      Review the prefilled Maya details and save your listing as a draft.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-[11px] font-medium text-[#445a5d]">
                      <span className="mb-1.5 block">Job title *</span>
                      <input
                        value={newListingForm.title}
                        onChange={(event) => updateNewListingForm("title", event.target.value)}
                        placeholder={newListingType === "ojt" ? "e.g. OJT Intern" : "e.g. Backend Developer"}
                        className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]"
                      />
                    </label>

                    <label className="block text-[11px] font-medium text-[#445a5d]">
                      <span className="mb-1.5 block">Department *</span>
                      <input
                        value={newListingForm.department}
                        onChange={(event) => updateNewListingForm("department", event.target.value)}
                        placeholder="e.g. Platform Engineering"
                        className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]"
                      />
                    </label>

                    <label className="block text-[11px] font-medium text-[#445a5d]">
                      <span className="mb-1.5 block">Location *</span>
                      <input
                        value={newListingForm.location}
                        onChange={(event) => updateNewListingForm("location", event.target.value)}
                        placeholder="BGC, Taguig City"
                        className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]"
                      />
                    </label>

                    <label className="block text-[11px] font-medium text-[#445a5d]">
                      <span className="mb-1.5 block">Work setup *</span>
                      <select
                        value={newListingForm.workSetup}
                        onChange={(event) => updateNewListingForm("workSetup", event.target.value)}
                        className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]"
                      >
                        <option>Hybrid</option>
                        <option>On-site</option>
                        <option>Remote</option>
                      </select>
                    </label>

                    <label className="block text-[11px] font-medium text-[#445a5d]">
                      <span className="mb-1.5 block">Available slots *</span>
                      <input
                        value={newListingForm.availableSlots}
                        onChange={(event) => updateNewListingForm("availableSlots", event.target.value)}
                        className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]"
                      />
                    </label>

                    <label className="block text-[11px] font-medium text-[#445a5d]">
                      <span className="mb-1.5 block">Required hours *</span>
                      <input
                        value={newListingForm.requiredHours}
                        onChange={(event) => updateNewListingForm("requiredHours", event.target.value)}
                        className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block text-[11px] font-medium text-[#445a5d]">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span>Listing summary *</span>
                      <span className="text-[10px] text-[#798e8f]">Shown to applicants</span>
                    </div>
                    <textarea
                      value={newListingForm.summary}
                      onChange={(event) => updateNewListingForm("summary", event.target.value)}
                      placeholder="Describe the role, team, and impact of this opportunity."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]"
                    />
                  </label>

                  <div className="mt-3 rounded-[10px] border border-[#dfeae8] bg-[#edf9f6] px-3 py-2 text-[10px] leading-5 text-[#476368]">
                    <span className="mr-2 text-[#0d8fa2]">•</span>
                    Maya&apos;s support and Maya&apos;s eligible counselors will be included from employer onboarding.
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf1f0] pt-4">
                    <button
                      type="button"
                      onClick={() => setNewListingStep(1)}
                      className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]"
                    >
                      ← Back
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={closeCreateModal}
                        className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={closeCreateModal}
                        className="rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]"
                      >
                        Save as draft
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
