import { downloadCsv } from "../../utils/csv";

type IconName = "users" | "building" | "briefcase" | "applications" | "check" | "download" | "clock" | "bell" | "chevron";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2"/></>,
    applications: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M5 21h14"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
  };

  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const stats = [
  { label: "Applicants", value: "12,480", change: "8.4% this month", icon: "users" },
  { label: "Employers", value: "842", change: "5.2% this month", icon: "building" },
  { label: "Job posts", value: "1,964", change: "12.1% this month", icon: "briefcase" },
  { label: "Applications", value: "38,729", change: "9.8% this month", icon: "applications" },
  { label: "Hires", value: "1,208", change: "6.7% this month", icon: "check" },
] as const;

const jobs = [
  ["Frontend Engineer", "Junior", "248", "100%"],
  ["Senior Product Designer", "Senior", "198", "80%"],
  ["Product Manager", "Lead", "174", "70%"],
  ["UX Researcher", "Mid-Senior", "143", "58%"],
  ["Data Analyst", "Mid-level", "119", "48%"],
];

export default function HomeAdmin() {
  const exportReport = () => {
    downloadCsv("careerconnect-report.csv", [
      ["Metric", "Value", "Change"],
      ...stats.map((stat) => [stat.label, stat.value, stat.change]),
      [],
      ["Most-applied jobs", "Level", "Applications"],
      ...jobs.map(([title, level, count]) => [title, level, count]),
      [],
      ["Platform health", "Value"],
      ["Application completion", "94%"],
      ["Verified employers", "96%"],
      ["Active users", "10,804"],
    ]);
  };

  return (
    <main className="min-h-[calc(100vh-98px)] bg-[#f4f8f8] px-0 py-0 text-[#263638]">
      <div className="mx-auto max-w-[1120px] max-[1120px]:px-4">
        <div className="mb-6 flex items-start justify-between max-[680px]:flex-col max-[680px]:gap-3">
          <div>
            <p className="text-[11px] font-semibold text-[#078b8d]">Platform overview · May 2023</p>
            <h1 className="mt-1 text-[22px] font-bold tracking-[-0.35px] text-[#263638]">Reports overview</h1>
            <p className="mt-1 text-[12px] text-[#718181]">Monitor platform activity, growth, and marketplace health.</p>
          </div>
          <button onClick={exportReport} className="mt-[24px] inline-flex h-8 items-center gap-2 rounded-md border border-[#edf1f1] bg-white px-3 text-[11px] font-medium text-[#627274] shadow-[0_1px_2px_rgba(38,58,59,.05)] max-[680px]:mt-0 max-[680px]:w-full max-[680px]:justify-center">
            <Icon name="download" className="size-3.5" /> Export report
          </button>
        </div>

        <section className="grid grid-cols-5 gap-3 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          {stats.map((stat) => (
            <article key={stat.label} className="flex min-h-[94px] items-start justify-between rounded-md border border-[#edf1f1] bg-white px-4 py-[15px] shadow-[0_1px_1px_rgba(38,58,59,.02)]">
              <div>
                <p className="text-[11px] text-[#718181]">{stat.label}</p>
                <p className="mt-2 text-[22px] font-bold leading-none text-[#293d3e]">{stat.value}</p>
                <p className="mt-3 text-[10px] font-medium text-[#2d9f62]">↗ {stat.change}</p>
              </div>
              <span className="grid size-8 place-items-center rounded-full bg-[#edf7f6] text-[#078b8d]">
                <Icon name={stat.icon === "applications" ? "applications" : stat.icon} className="size-[14px]" />
              </span>
            </article>
          ))}
        </section>

        <section className="mt-3 grid grid-cols-[minmax(0,2.04fr)_minmax(280px,1fr)] gap-3 max-lg:grid-cols-1">
          <article className="overflow-hidden rounded-md border border-[#edf1f1] bg-white">
            <div className="flex h-14 items-center justify-between px-5">
              <div><h2 className="text-[13px] font-bold">Most-applied jobs</h2><p className="mt-1 text-[10px] text-[#879595]">Total jobs: 924 · sorted by application count.</p></div>
              <button className="inline-flex h-7 items-center gap-1 rounded-md border border-[#edf1f1] px-2.5 text-[10px] text-[#627274]">Last 30 days <Icon name="chevron" className="size-3" /></button>
            </div>
            <div className="border-t border-[#edf1f1] px-5 pb-4">
              {jobs.map(([title, level, count, width], index) => (
                <div key={title} className="pt-[14px]">
                  <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start">
                    <span className="pt-0.5 text-[10px] text-[#9aa4a4]">{index + 1}</span>
                    <div><p className="text-[11px] font-semibold text-[#344849]">{title}</p><p className="mt-0.5 text-[9px] text-[#9aa4a4]">{level}</p></div>
                    <span className="text-[10px] font-semibold text-[#344849]">{count}</span>
                  </div>
                  <div className="ml-[22px] mt-[6px] h-[4px] overflow-hidden rounded-full bg-[#edf2f2]"><div className="h-full rounded-full bg-[#078b8d]" style={{ width }} /></div>
                </div>
              ))}
            </div>
          </article>

          <div className="grid gap-3 content-start">
            <article className="h-[98px] rounded-md border border-[#edf1f1] bg-white">
              <div className="flex h-[38px] items-center justify-between border-b border-[#edf1f1] px-4"><h2 className="text-[12px] font-bold">Employer notifications</h2><span className="grid size-6 place-items-center rounded-full bg-[#fffaf2] text-[#d8a54b]"><Icon name="clock" className="size-3.5" /></span></div>
              <div className="px-3 pt-3"><button className="h-[30px] w-full rounded-md bg-[#078b8d] text-[10px] font-bold text-white">Review queue</button></div>
            </article>

            <article className="h-[186px] rounded-md border border-[#edf1f1] bg-white">
              <div className="flex h-[38px] items-center justify-between border-b border-[#edf1f1] px-4"><h2 className="text-[12px] font-bold">Platform health</h2><span className="grid size-6 place-items-center rounded-full bg-[#fffaf2] text-[#d8a54b]"><Icon name="bell" className="size-3.5" /></span></div>
              <dl className="px-4">
                {[['Application completion', '94%'], ['Verified employers', '96%'], ['Active users', '10,804']].map(([label, value]) => <div key={label} className="flex h-8 items-center justify-between border-b border-[#f1f3f3] text-[10px]"><dt className="text-[#879393]">{label}</dt><dd className="font-semibold text-[#344849]">{value}</dd></div>)}
              </dl>
              <button className="float-right pr-4 pt-3 text-[9px] font-medium text-[#078b8d]">View details</button>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
