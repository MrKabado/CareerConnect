const statCards = [
  {
    label: "Active listings",
    value: 4,
    detail: "2 active · 2 OJT",
    accent: "bg-[#e7f7f0] text-[#178a70] border-[#cdecd8]",
    bar: "bg-[#2ac08d]",
  },
  {
    label: "Total applicants",
    value: 120,
    detail: "4 recent profiles",
    accent: "bg-[#eef7ff] text-[#2a72d8] border-[#d4eafc]",
    bar: "bg-[#4a90ff]",
  },
  {
    label: "Open positions",
    value: 10,
    detail: "Across 4 departments",
    accent: "bg-[#fff5dc] text-[#c68a1d] border-[#f2e5b9]",
    bar: "bg-[#f5ba36]",
  },
  {
    label: "Hired",
    value: 8,
    detail: "This quarter",
    accent: "bg-[#f2ecff] text-[#6f5fd6] border-[#ddd3ff]",
    bar: "bg-[#8d71f4]",
  },
] as const;

const pipeline = [
  { label: "Applied", count: 42, color: "#1e9fe5" },
  { label: "Under Review", count: 31, color: "#6a5ff4" },
  { label: "Interview Scheduled", count: 17, color: "#39b3ab" },
  { label: "Hired", count: 8, color: "#1db56d" },
  { label: "Rejected", count: 12, color: "#f15d6b" },
] as const;

const applicants = [
  {
    name: "Jamie Dela Cruz",
    role: "Frontend Developer",
    stage: "Interview scheduled",
    badge: "92% match",
  },
  {
    name: "Angela Mercado",
    role: "Software Engineer",
    stage: "Shortlisted",
    badge: "89% match",
  },
  {
    name: "Paolo Reyes",
    role: "Junior UI Developer",
    stage: "Under review",
    badge: "96% match",
  },
  {
    name: "Clarisse Bautista",
    role: "Product Designer",
    stage: "Applied",
    badge: "84% match",
  },
] as const;

const hiringSetup = [
  {
    title: "Jobs",
    subtitle: "1 role",
    count: 2,
    active: "active",
  },
  {
    title: "OJT",
    subtitle: "6 roles",
    count: 6,
    active: "active",
  },
  {
    title: "Internships",
    subtitle: "3 roles",
    count: 3,
    active: "active",
  },
] as const;

const jobRows = [
  {
    title: "Frontend Developer",
    type: "Job",
    location: "Remote",
    applicants: 48,
    status: "Active",
    tone: "bg-[#eafaf2] text-[#1d9d6a]",
  },
  {
    title: "Software Engineer",
    type: "OJT",
    location: "Hybrid",
    applicants: 31,
    status: "Review",
    tone: "bg-[#edf5ff] text-[#2d6ccc]",
  },
  {
    title: "Customer Experience Specialist",
    type: "Job",
    location: "On-site",
    applicants: 27,
    status: "Review",
    tone: "bg-[#edf5ff] text-[#2d6ccc]",
  },
  {
    title: "Operations Trainer",
    type: "OJT",
    location: "Remote",
    applicants: 14,
    status: "Review",
    tone: "bg-[#edf5ff] text-[#2d6ccc]",
  },
] as const;

function DashboardBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#dce8e6] bg-[#f1f7f6] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#0d6b70]">
      {children}
    </span>
  );
}

export default function EmployerOverviewPage() {
  return (
    <div className="min-h-screen bg-[#edf3f2] text-[#243a3c]">
      <div className="h-3 w-full bg-[#0a4d5f]" />

      <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-4 md:px-6 xl:px-0">
        <div className="overflow-hidden rounded-[18px] border border-[#e2ebe8] bg-[#f6f8f7] shadow-[0_12px_32px_rgba(27,54,52,0.08)]">
          <header className="flex items-center justify-between gap-4 border-b border-[#ebf1ef] bg-white px-5 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0b8a9d] text-base font-bold text-white shadow-[0_6px_18px_rgba(11,138,157,0.3)]">
                C
              </div>

              <div className="flex items-center gap-2 text-left">
                <div className="text-[15px] font-bold tracking-[-0.04em] text-[#243a3c]">
                  Career<span className="text-[#0b8a9d]">Connect</span>
                </div>
                <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#6e7d7d]">
                  Employer
                </span>
              </div>
            </div>

            <nav className="hidden items-center gap-8 md:flex" aria-label="Employer main navigation">
              {[
                "Overview",
                "Job Listings",
                "Applicants",
              ].map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`relative text-sm font-medium ${
                    index === 0
                      ? "text-[#0b8a9d] after:absolute after:-bottom-5 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-[#0b8a9d]"
                      : "text-[#5f6d6f]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open notifications"
                className="grid h-9 w-9 place-items-center rounded-full border border-[#e6efed] bg-[#f3f7f6] text-[#587072] transition hover:border-[#d6e7e5] hover:text-[#1d4b52]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 18a3 3 0 0 0 6 0" />
                </svg>
              </button>

              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d9efe8] text-[11px] font-bold text-[#1b665f]">
                MP
              </div>
            </div>
          </header>

          <main className="bg-[#f6f8f7] p-5 md:p-8">
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium text-[#6c7b7d]">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }).format(new Date())}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-[#1d3133] md:text-[2.3rem]">
                  Good day, Maya Philippines
                </h1>
                <p className="mt-2 text-sm text-[#647578]">
                  Here&apos;s what&apos;s happening with your hiring pipeline.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full border border-[#dfe9e7] bg-white p-1 shadow-sm">
                {['All', 'Hiring', 'Jobs', 'OJT'].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      index === 0
                        ? "bg-[#0a8a97] text-white shadow-[0_4px_10px_rgba(10,138,151,0.2)]"
                        : "text-[#586d6f] hover:bg-[#f1f7f6]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ label, value, detail, accent, bar }) => (
                <div key={label} className="rounded-[18px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.04)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className={`inline-flex rounded-xl border px-2.5 py-2 ${accent}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${bar}`} />
                    </div>
                    <DashboardBadge>Live</DashboardBadge>
                  </div>

                  <div className="text-sm font-medium text-[#5d6d6f]">{label}</div>
                  <div className="mt-2 text-[2rem] font-bold tracking-[-0.06em] text-[#1a2f32]">{value}</div>
                  <div className="mt-3 border-t border-[#edf2f1] pt-3 text-[11px] text-[#6f7d7d]">{detail}</div>
                </div>
              ))}
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_24px_rgba(31,51,52,0.04)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[#1d3133]">Hiring pipeline</h2>
                  <button type="button" className="text-xs font-medium text-[#0d8a95]">
                    View all
                  </button>
                </div>

                <div className="space-y-4">
                  {pipeline.map(({ label, count, color }) => (
                    <div key={label} className="grid grid-cols-[100px_minmax(0,1fr)_42px] items-center gap-3 text-[12px]">
                      <span className="font-medium text-[#697d7d]">{label}</span>
                      <div className="h-2.5 rounded-full bg-[#edf2f1]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${count}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-right font-semibold text-[#1d3133]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_24px_rgba(31,51,52,0.04)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[#1d3133]">Recent applicants</h2>
                  <button type="button" className="text-xs font-medium text-[#0d8a95]">
                    View all
                  </button>
                </div>

                <div className="space-y-3">
                  {applicants.map(({ name, role, stage, badge }) => (
                    <div key={name} className="flex items-center gap-3 rounded-2xl border border-[#edf2f1] bg-[#f9fbfb] p-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#dfeef0] text-[10px] font-bold text-[#234f57]">
                        {name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-[#1d3133]">{name}</p>
                          <span className="rounded-full bg-[#eaf5f5] px-2 py-0.5 text-[9px] font-semibold text-[#1a7f8b]">
                            {badge}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#647578]">{role}</p>
                        <p className="mt-1 text-[10px] font-medium text-[#5f6d6f]">{stage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-[22px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_24px_rgba(31,51,52,0.04)]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#1d3133]">Hiring setup</h2>
                  <p className="mt-1 text-sm text-[#687d7d]">Defaults from employer onboarding</p>
                </div>
                <button type="button" className="text-sm font-medium text-[#0d8a95]">
                  Edit
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {hiringSetup.map(({ title, subtitle, count }) => (
                  <div key={title} className="rounded-[18px] border border-[#e3ecea] bg-[#f9fbfb] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#65767a]">
                        {title}
                      </p>
                      <span className="rounded-full bg-[#edf8f5] px-2 py-1 text-[9px] font-semibold text-[#188d71]">
                        {count} roles
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-[#65767a]">{subtitle}</p>
                        <p className="mt-1 text-sm font-semibold text-[#1d3133]">{count} roles</p>
                      </div>
                      <button type="button" className="rounded-full bg-[#0ca5a4] px-3 py-1.5 text-[10px] font-semibold text-white">
                        Active
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {jobRows.map(({ title, type, location, applicants, status, tone }) => (
                  <div
                    key={title}
                    className="grid gap-3 rounded-[18px] border border-[#e7efee] bg-[#fbfdfd] p-3 sm:grid-cols-[minmax(0,1.5fr)_auto_auto_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#1e3436]">{title}</p>
                        <span className="rounded-full bg-[#edf7f7] px-2 py-0.5 text-[9px] font-semibold text-[#3a6d74]">
                          {type}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#667d7d]">{location}</p>
                    </div>

                    <div className="text-[11px] text-[#5a6e70]">{applicants} applicants</div>
                    <div className="text-[11px] text-[#5a6e70]">{location}</div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>
                      {status}
                    </span>
                    <button type="button" className="rounded-full bg-[#0c8c96] px-3 py-1.5 text-[10px] font-semibold text-white">
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <footer className="border-t border-[#eef1f0] bg-white px-4 py-3 text-center text-[11px] font-medium text-[#7a8b8d]">
            © 2026 CareerConnect · Employer workspace
          </footer>
        </div>
      </div>
    </div>
  );
}
