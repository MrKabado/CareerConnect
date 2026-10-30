const strengths = [
  "Company information",
  "Hiring locations",
  "Benefits and culture",
  "Company values",
];

const lifeAtItems = [
  {
    title: "Customer first",
    description: "We build with our customers' needs in mind and create solutions that are useful, practical, and human-centered.",
  },
  {
    title: "Move with purpose",
    description: "We work with urgency, align on goals, and focus on outcomes that create meaningful impact.",
  },
  {
    title: "Win as one",
    description: "We combine diverse strengths, share knowledge, and celebrate wins together as a team.",
  },
];

const benefits = [
  "Competitive compensation",
  "Health and wellness coverage",
  "Performance incentives",
  "Hybrid work options",
  "Learning and development",
  "Employee perks",
];

const locations = [
  { city: "BGC, Taguig City", label: "Primary hub" },
  { city: "Makati City", label: "Regional office" },
  { city: "Quezon City", label: "Operations hub" },
];

export default function EmployerCompanyProfilePage() {
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
                { label: "Job Listings", active: false },
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
                  Company Profile
                </h1>
                <p className="mt-2 text-sm text-[#697d7d]">
                  Manage how Maya Philippines appears to job and OJT applicants.
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-[#dfe8e7] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d3133] shadow-sm transition hover:border-[#d1e6e4]"
              >
                <svg className="mr-2" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 3.5v12M3.5 10h13" />
                </svg>
                Preview public profile
              </button>
            </div>

            <section className="rounded-[18px] border border-[#dfeae8] bg-white p-4 shadow-[0_10px_20px_rgba(27,54,52,0.03)] md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-[72px] w-[72px] place-items-center rounded-[18px] bg-[#0d8fa2] text-[28px] font-bold text-white shadow-[0_10px_20px_rgba(12,143,162,0.22)]">
                    M
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#def4ee] px-2 py-1 text-[9px] font-semibold text-[#228578]">
                        <span aria-hidden="true">✓</span> Verified employer
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1d9] px-2 py-1 text-[9px] font-semibold text-[#a2782d]">
                        Top recommended
                      </span>
                    </div>

                    <h2 className="text-[28px] font-bold tracking-[-0.06em] text-[#1d3034]">
                      Maya Philippines
                    </h2>
                    <p className="mt-1 text-[11px] text-[#5a6e70]">
                      Powering the digital economy for every Filipino
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-[15px] border border-[#e2eeeb] bg-[#f6fbfa] px-4 py-3 text-center">
                    <div className="text-[17px] font-bold text-[#1d3133]">1,000+</div>
                    <div className="mt-1 text-[9px] text-[#7d8b8d]">Employees</div>
                  </div>
                  <div className="rounded-[15px] border border-[#e2eeeb] bg-[#f6fbfa] px-4 py-3 text-center">
                    <div className="text-[17px] font-bold text-[#1d3133]">4.7</div>
                    <div className="mt-1 text-[9px] text-[#7d8b8d]">Employer rating</div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl bg-[#0d8fa2] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0b7a89]"
                  >
                    Edit company profile
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
              <div className="space-y-5">
                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                        About Maya Philippines
                      </h2>
                      <p className="mt-1 text-[11px] text-[#6a7d7d]">
                        Company overview and hiring snapshot
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-[#dfe9e7] bg-[#f8fbfb] px-3 py-1.5 text-[10px] font-semibold text-[#1c737e]"
                    >
                      Edit
                    </button>
                  </div>

                  <p className="text-[12px] leading-6 text-[#4d5f61]">
                    Maya Philippines is a leading digital financial services company creating more inclusive ways for Filipinos to manage money, pay bills, save, and access digital financial tools. From payments and lending to transactions and developer programs, Maya helps millions of people and businesses move forward with confidence.
                  </p>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[14px] border border-[#edf1f0] bg-[#f7fbfa] p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a7d]">
                        Industry
                      </div>
                      <div className="mt-2 text-[13px] font-semibold text-[#1d3133]">Financial Technology</div>
                    </div>
                    <div className="rounded-[14px] border border-[#edf1f0] bg-[#f7fbfa] p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a7d]">
                        HQ
                      </div>
                      <div className="mt-2 text-[13px] font-semibold text-[#1d3133]">BGC, Taguig City</div>
                    </div>
                    <div className="rounded-[14px] border border-[#edf1f0] bg-[#f7fbfa] p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a7d]">
                        Founded
                      </div>
                      <div className="mt-2 text-[13px] font-semibold text-[#1d3133]">2014</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                        Life at Maya
                      </h2>
                      <p className="mt-1 text-[11px] text-[#6a7d7d]">
                        The values that guide how we work every day
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {lifeAtItems.map((item) => (
                      <article key={item.title} className="rounded-[16px] bg-[#f2f8f7] p-4">
                        <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#dbf0ee] text-[15px] font-semibold text-[#0d8fa2]">
                          {item.title.charAt(0)}
                        </div>
                        <h3 className="mt-3 text-[13px] font-bold text-[#1d3034]">{item.title}</h3>
                        <p className="mt-2 text-[11px] leading-5 text-[#566d6f]">{item.description}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                        Benefits and workplace
                      </h2>
                      <p className="mt-1 text-[11px] text-[#6a7d7d]">
                        What candidates can expect when they join Maya
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {benefits.map((benefit) => (
                      <span
                        key={benefit}
                        className="rounded-full border border-[#dfeae8] bg-[#f8fbfa] px-2.5 py-1.5 text-[10px] font-medium text-[#53697a]"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] font-bold tracking-[-0.05em] text-[#1d3034]">
                        Hiring locations
                      </h2>
                      <p className="mt-1 text-[11px] text-[#6a7d7d]">
                        Maya teams currently hiring across the country
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {locations.map((location) => (
                      <div key={location.city} className="rounded-[16px] border border-[#e7efee] bg-[#f7fbfa] p-4 text-center">
                        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#def4ee] text-[#0d8fa2]">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 21s6-5.69 6-11a6 6 0 1 0-12 0c0 5.31 6 11 6 11Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                        </div>
                        <h3 className="mt-3 text-[13px] font-bold text-[#1d3034]">{location.city}</h3>
                        <p className="mt-1 text-[10px] text-[#677d7d]">{location.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-[14px] font-bold text-[#1d3034]">Profile strength</h2>
                    <span className="text-[12px] font-bold text-[#1d3034]">92%</span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2f1]">
                    <div className="h-full rounded-full bg-[#0d8fa2]" style={{ width: "92%" }} />
                  </div>

                  <ul className="mt-4 space-y-3 text-[11px] text-[#516d70]">
                    {strengths.map((strength) => (
                      <li key={strength} className="flex items-center gap-2">
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-[#dff4ef] text-[8px] font-bold text-[#1b8d87]">
                          ✓
                        </span>
                        {strength}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl bg-[#0d8fa2] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0b7a89]"
                  >
                    Add company media
                  </button>
                </div>

                <div className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(31,51,52,0.03)] md:p-5">
                  <h2 className="text-[14px] font-bold text-[#1d3034]">Company contact</h2>

                  <dl className="mt-4 space-y-3 text-[11px] text-[#5a6970]">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Website</dt>
                      <dd className="font-medium text-[#1d3133]">www.maya.ph</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Hiring email</dt>
                      <dd className="font-medium text-[#1d3133]">careers@maya.ph</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Contact</dt>
                      <dd className="font-medium text-[#1d3133]">+63 2 8123 7788</dd>
                    </div>
                  </dl>

                  <div className="mt-5 rounded-[16px] border border-[#edf1f0] bg-[#f7fbfa] p-3">
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="text-[#617779]">Hiring activity</span>
                      <span className="font-semibold text-[#1d3133]">4 active listings</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-[12px] bg-white p-3">
                        <div className="text-[18px] font-bold text-[#1d3133]">4</div>
                        <div className="mt-1 text-[9px] text-[#6a7d7d]">Active listings</div>
                      </div>
                      <div className="rounded-[12px] bg-white p-3">
                        <div className="text-[18px] font-bold text-[#1d3133]">120</div>
                        <div className="mt-1 text-[9px] text-[#6a7d7d]">Applicants</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#0d8fa2] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0b7a89]"
                  >
                    View job listings
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
