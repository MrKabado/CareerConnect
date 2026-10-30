import { useMemo, useState } from "react";

type ApplicantStatus =
  | "Shortlisted"
  | "Under Review"
  | "Interview Scheduled"
  | "Applied"
  | "Rejected";

type Applicant = {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  location: string;
  appliedDate: string;
  match: number;
  status: ApplicantStatus;
  profileMatch: number;
  jobType: "Job" | "OJT";
  summary: string;
  skills: string[];
  experience: string;
  education: string;
  portfolio: string;
};

const applicants: Applicant[] = [
  {
    id: "sola-lim",
    name: "Sola Lim",
    initials: "SL",
    role: "Data Analyst",
    department: "Analytics",
    location: "Quezon City",
    appliedDate: "April 14, 2026",
    match: 95,
    status: "Shortlisted",
    profileMatch: 95,
    jobType: "Job",
    summary: "Data analyst with a strong background in product and reporting workflows.",
    skills: ["SQL", "Python", "Dashboarding"],
    experience: "3 years experience",
    education: "Bachelor of Science in Applied Statistics",
    portfolio: "Portfolio available on request",
  },
  {
    id: "jamie-dela-cruz",
    name: "Jamie Dela Cruz",
    initials: "JD",
    role: "Frontend Developer",
    department: "Product",
    location: "Taguig City",
    appliedDate: "April 21, 2026",
    match: 92,
    status: "Interview Scheduled",
    profileMatch: 92,
    jobType: "Job",
    summary: "Senior frontend developer focused on high-quality UI systems and accessibility.",
    skills: ["React", "TypeScript", "Design systems"],
    experience: "5 years experience",
    education: "BS Information Technology",
    portfolio: "GitHub portfolio and live product demos",
  },
  {
    id: "angela-mercado",
    name: "Angela Mercado",
    initials: "AM",
    role: "Software Engineering Intern",
    department: "Engineering",
    location: "BGC, Taguig City",
    appliedDate: "April 21, 2026",
    match: 89,
    status: "Shortlisted",
    profileMatch: 89,
    jobType: "OJT",
    summary: "Motivated software engineering trainee with hands-on backend and API experience.",
    skills: ["JavaScript", "Node.js", "API design"],
    experience: "2 years experience",
    education: "Computer Science student",
    portfolio: "Open-source contributions and projects",
  },
  {
    id: "nicole-garcia",
    name: "Nicole Garcia",
    initials: "NG",
    role: "Frontend Developer",
    department: "Product",
    location: "Makati City",
    appliedDate: "April 18, 2026",
    match: 88,
    status: "Shortlisted",
    profileMatch: 88,
    jobType: "Job",
    summary: "Product-minded frontend engineer with strong visual systems and stakeholder collaboration.",
    skills: ["UI engineering", "Accessibility", "Figma"],
    experience: "4 years experience",
    education: "BS Computer Science",
    portfolio: "Design system portfolio",
  },
  {
    id: "paolo-reyes",
    name: "Paolo Reyes",
    initials: "PR",
    role: "Frontend Developer",
    department: "Product",
    location: "Cebu City",
    appliedDate: "April 20, 2026",
    match: 88,
    status: "Under Review",
    profileMatch: 88,
    jobType: "Job",
    summary: "Frontend specialist with cross-functional experience across product and design teams.",
    skills: ["React", "Design systems", "CSS"],
    experience: "3 years experience",
    education: "BS Computer Science",
    portfolio: "Portfolio available",
  },
  {
    id: "clarisse-bautista",
    name: "Clarisse Bautista",
    initials: "CB",
    role: "Software Engineering Intern",
    department: "Engineering",
    location: "BGC, Taguig City",
    appliedDate: "April 20, 2026",
    match: 84,
    status: "Applied",
    profileMatch: 84,
    jobType: "OJT",
    summary: "Emerging engineer with a strong interest in frontend product development and user experience.",
    skills: ["JavaScript", "React", "UI Design"],
    experience: "1 year experience",
    education: "BS Information Systems",
    portfolio: "School capstone and coursework",
  },
  {
    id: "marco-villanueva",
    name: "Marco Villanueva",
    initials: "MV",
    role: "Customer Experience Specialist",
    department: "Operations",
    location: "Quezon City",
    appliedDate: "April 18, 2026",
    match: 82,
    status: "Applied",
    profileMatch: 82,
    jobType: "Job",
    summary: "Support professional with excellent communication and customer journey ownership.",
    skills: ["Customer support", "CRM", "Troubleshooting"],
    experience: "4 years experience",
    education: "Bachelor of Arts in Communications",
    portfolio: "Customer service portfolio",
  },
  {
    id: "rafael-santos",
    name: "Rafael Santos",
    initials: "RS",
    role: "Customer Experience Specialist",
    department: "Operations",
    location: "Davao City",
    appliedDate: "April 20, 2026",
    match: 66,
    status: "Rejected",
    profileMatch: 66,
    jobType: "Job",
    summary: "Customer support candidate with service background and strong communication skills.",
    skills: ["Service", "CRM", "Operations"],
    experience: "2 years experience",
    education: "BS Business Administration",
    portfolio: "Previous client support work",
  },
] as const;

const statusStyles: Record<ApplicantStatus, string> = {
  Shortlisted: "bg-[#edf8f2] text-[#1d9d75] border border-[#dfeee7]",
  "Under Review": "bg-[#edf5ff] text-[#356bcc] border border-[#d5e5ff]",
  "Interview Scheduled": "bg-[#f8f0ff] text-[#7a5ec8] border border-[#eadcff]",
  Applied: "bg-[#eef3f6] text-[#4e6871] border border-[#dfe9ee]",
  Rejected: "bg-[#fbe9e9] text-[#b85054] border border-[#f4d4d6]",
};

const filterOptions = ["All applicants", "Job", "OJT"] as const;

function StatusPill({ status }: { status: ApplicantStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

export default function EmployerApplicantsPage() {
  const [selectedId, setSelectedId] = useState<string>(applicants[1].id);
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>("All applicants");

  const visibleApplicants = useMemo(() => {
    if (filter === "Job") {
      return applicants.filter((applicant) => applicant.jobType === "Job");
    }

    if (filter === "OJT") {
      return applicants.filter((applicant) => applicant.jobType === "OJT");
    }

    return applicants;
  }, [filter]);

  const selectedApplicant =
    visibleApplicants.find((applicant) => applicant.id === selectedId) ??
    visibleApplicants[0] ??
    applicants[0];

  return (
    <div className="min-h-screen bg-[#edf3f2] text-[#243a3c]">
      <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-4 md:px-6 xl:px-0">
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
                { label: "Job Listings", active: false },
                { label: "Applicants", active: true },
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
                  Applicants
                </h1>
                <p className="mt-2 text-sm text-[#697d7d]">
                  Review candidates with lasting and onboarding match context.
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#1b707a] shadow-sm"
              >
                <span className="rounded-full bg-[#edf8f5] px-1.5 py-1 text-[10px] text-[#0f8d86]">All</span>
                All applicants
              </button>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total applicants", value: 8, detail: "All active applicants", tone: "bg-[#ecf8f7] text-[#1d9d75]" },
                { label: "New applicants", value: 2, detail: "Awaiting review", tone: "bg-[#eef5ff] text-[#3577d4]" },
                { label: "Shortlisted", value: 2, detail: "Selected for next step", tone: "bg-[#f7f0ff] text-[#7a5ec8]" },
                { label: "Interview scheduled", value: 1, detail: "Confirmed this week", tone: "bg-[#fff4df] text-[#c58a1d]" },
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
                    aria-label="Search applicants"
                    defaultValue=""
                    placeholder="Search applicant, role, or skill"
                    className="w-full rounded-xl border border-[#e1eaeb] bg-[#f9fbfb] py-2.5 pl-10 pr-3 text-sm text-[#243a3c] placeholder:text-[#86999c] outline-none transition focus:border-[#b9dfe1] focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
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

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#dfe9e7] bg-[#f9fbfb] px-3 py-2 text-sm text-[#3f5d61]"
                  >
                    <span>All statuses</span>
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 7 5 5 5-5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
              <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#1d3034]">Candidate pipeline</h2>
                    <p className="mt-1 text-[11px] text-[#738385]">{visibleApplicants.length} applicants shown</p>
                  </div>
                  <button type="button" className="text-[11px] font-medium text-[#0d8a95]">
                    Review all
                  </button>
                </div>

                <div className="space-y-3">
                  {visibleApplicants.map((applicant) => {
                    const isSelected = applicant.id === selectedApplicant.id;

                    return (
                      <div
                        key={applicant.id}
                        className={`rounded-[16px] border p-3 transition ${
                          isSelected ? "border-[#cfe6ea] bg-[#f4fafb] shadow-[0_8px_18px_rgba(14,142,155,0.08)]" : "border-[#edf1f1] bg-[#fbfdfd]"
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dfeef0] text-[10px] font-bold text-[#2a5361]">
                              {applicant.initials}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[15px] font-semibold text-[#1d3034]">{applicant.name}</p>
                                <span className="inline-flex rounded-full bg-[#edf6f6] px-2 py-0.5 text-[9px] font-semibold text-[#43717a]">
                                  {applicant.jobType}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-[#5f7173]">{applicant.role}</p>
                              <p className="mt-1 text-[10px] text-[#7d8a8b]">
                                {applicant.location} · Applied {applicant.appliedDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 md:justify-end">
                            <StatusPill status={applicant.status} />
                            <button
                              type="button"
                              onClick={() => setSelectedId(applicant.id)}
                              className="rounded-full border border-[#d8e8e6] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#0c808d]"
                            >
                              Review
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#eef2f1] pt-3">
                          <div className="flex items-center gap-2 text-[10px] text-[#64797b]">
                            <span className="font-medium">Profile match</span>
                            <span className="text-[#1d3133]">{applicant.match}%</span>
                          </div>
                          <button type="button" className="text-[10px] font-medium text-[#0d8a95]">
                            View profile
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6d7d7d]">
                    <span>{selectedApplicant.jobType}</span>
                  </div>
                  <span className="text-[10px] text-[#738285]">Updated 2 days ago</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#dfeef0] text-[10px] font-bold text-[#2a5361]">
                      {selectedApplicant.initials}
                    </div>
                    <div>
                      <h3 className="text-[19px] font-bold tracking-[-0.05em] text-[#1e3135]">
                        {selectedApplicant.name}
                      </h3>
                      <p className="mt-1 text-[11px] text-[#697d7d]">{selectedApplicant.role}</p>
                    </div>
                  </div>
                  <StatusPill status={selectedApplicant.status} />
                </div>

                <div className="mt-4 rounded-[16px] border border-[#e7efee] bg-[#f6faf9] p-3">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-[#5d7071]">
                    <span>Profile match</span>
                    <span className="font-semibold text-[#1d3133]">{selectedApplicant.match}%</span>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-[#e8efee]">
                    <div
                      className="h-full rounded-full bg-[#0d8fa2]"
                      style={{ width: `${selectedApplicant.match}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-[14px] border border-[#e7efee] bg-[#fbfdfd] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#647778]">
                      Profile match
                    </p>
                    <p className="mt-2 text-[12px] leading-5 text-[#4b6063]">
                      {selectedApplicant.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedApplicant.skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-[#edf6f6] px-2 py-1 text-[10px] font-medium text-[#2a5d67]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#e7efee] bg-[#fbfdfd] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#647778]">
                      Candidate details
                    </p>
                    <div className="mt-3 space-y-2 text-[11px] text-[#4d6467]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Location</span>
                        <span className="font-medium text-[#1d3133]">{selectedApplicant.location}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Experience</span>
                        <span className="font-medium text-[#1d3133]">{selectedApplicant.experience}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Education</span>
                        <span className="font-medium text-[#1d3133]">{selectedApplicant.education}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#dfeae9] bg-[#edf5f4] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5d7071]">
                      Hiring context
                    </p>
                    <div className="mt-3 space-y-2 text-[11px] text-[#4a5d5f]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Role</span>
                        <span className="font-medium text-[#1d3133]">{selectedApplicant.role}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Department</span>
                        <span className="font-medium text-[#1d3133]">{selectedApplicant.department}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Portfolio</span>
                        <span className="font-medium text-[#1d3133]">{selectedApplicant.portfolio}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]"
                  >
                    Contact applicant
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-sm font-semibold text-[#3f5d61]"
                  >
                    View resume
                  </button>
                </div>
              </aside>
            </section>
          </main>

          <footer className="border-t border-[#edf1f1] bg-white px-4 py-4 text-center text-[11px] font-medium text-[#7a8b8d]">
            © 2026 CareerConnect · Maya Philippines employer workspace
          </footer>
        </div>
      </div>
    </div>
  );
}
