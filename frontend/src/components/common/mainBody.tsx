import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { getCompanyProfileUrl } from "@/features/companies/companyProfiles";

type IconName = "search" | "chevron" | "pin" | "briefcase" | "bookmark";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2" /></>,
    bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

const jobs = [
  {
    id: "frontend",
    company: "Maya Philippines",
    initials: "M",
    title: "Frontend Developer",
    location: "BGC, Taguig City",
    arrangement: "Hybrid",
    salary: "₱70,000–₱100,000",
    posted: "2 hours ago",
    description: "Build secure, accessible digital banking experiences used by customers across the Philippines.",
    skills: ["React", "TypeScript", "Design systems"],
  },
  {
    id: "product",
    company: "Northstar Labs",
    initials: "N",
    title: "Senior Product Designer",
    location: "San Francisco, CA",
    arrangement: "Remote",
    salary: "$115,000–$145,000",
    posted: "2 days ago",
    description: "Shape intuitive experiences for teams doing their best work in a distributed environment.",
    skills: ["Product design", "Design systems", "Figma"],
  },
  {
    id: "research",
    company: "Vela Health",
    initials: "V",
    title: "UX Researcher",
    location: "Remote · United States",
    arrangement: "Remote",
    salary: "$90,000–$120,000",
    posted: "4 days ago",
    description: "Turn human insight into meaningful product direction for a rapidly growing digital health platform.",
    skills: ["Research", "Healthcare", "Remote"],
  },
  {
    id: "engineer",
    company: "Kindred Finance",
    initials: "K",
    title: "Frontend Engineer",
    location: "New York, NY",
    arrangement: "Hybrid",
    salary: "$110,000–$135,000",
    posted: "5 days ago",
    description: "Build accessible, high-quality interfaces alongside a close-knit product and design team.",
    skills: ["Frontend", "React", "Accessibility"],
  },
];

type MainBodyProps = {
  search: string;
  onSearchChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
};

export default function MainBody({ search, onSearchChange, location, onLocationChange }: MainBodyProps) {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    const matchesSearch = `${job.title} ${job.company} ${job.skills.join(" ")}`.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = `${job.location} ${job.arrangement}`.toLowerCase().includes(location.toLowerCase());
    return matchesSearch && matchesLocation;
  }), [location, search]);

  function toggleSaved(id: string) {
    setSavedJobs((saved) => saved.includes(id) ? saved.filter((jobId) => jobId !== id) : [...saved, id]);
  }

  function toggleEmploymentType(type: string) {
    setEmploymentTypes((selected) => selected.includes(type)
      ? selected.filter((item) => item !== type)
      : [...selected, type]);
  }

  return (
    <section className="mx-auto grid max-w-284 grid-cols-[296px_minmax(0,1fr)] items-start gap-7 py-12 pb-17 max-[1300px]:mx-10 max-[920px]:mx-6 max-[920px]:grid-cols-[210px_minmax(0,1fr)] max-[920px]:gap-4.5 max-[680px]:mx-0 max-[680px]:block max-[680px]:px-4.25 max-[680px]:pt-5.75 max-[680px]:pb-10.5" id="jobs">
      <aside className="rounded-[14px] border border-[#e9eeee] bg-white px-4.5 pt-5 pb-4.5 shadow-[0_3px_12px_rgba(47,77,76,0.025)] max-[920px]:px-3.5 max-[680px]:hidden">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[17px] font-bold tracking-[-0.35px] text-[#293d3e]">Filters</h2>
          <button className="py-1 text-[11px] font-semibold text-[#098487] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" onClick={() => { onSearchChange(""); onLocationChange(""); setEmploymentTypes([]); }}>Clear all</button>
        </div>
        <label className="mb-2 block text-[11px] font-medium text-[#718184]" htmlFor="location-filter">Location</label>
        <div className="relative mb-4.25 flex items-center">
          <select className="h-9.25 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-7.75 pl-2.75 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" id="location-filter" defaultValue="Any location">
            <option>Any location</option>
            <option>Metro Manila</option>
            <option>Cebu City</option>
            <option>Davao City</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[#849394]"><Icon name="chevron" size={15} /></span>
        </div>
        <label className="mb-2 block text-[11px] font-medium text-[#718184]" htmlFor="category-filter">Category</label>
        <div className="relative mb-4.25 flex items-center">
          <select className="h-9.25 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-7.75 pl-2.75 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" id="category-filter" defaultValue="All categories">
            <option>All categories</option>
            <option>Technology</option>
            <option>Design</option>
            <option>Marketing</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[#849394]"><Icon name="chevron" size={15} /></span>
        </div>
        <label className="mb-2 block text-[11px] font-medium text-[#718184]" htmlFor="setup-filter">Work setup</label>
        <div className="relative mb-4.25 flex items-center">
          <select className="h-9.25 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-7.75 pl-2.75 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" id="setup-filter" defaultValue="Any setup">
            <option>Any setup</option>
            <option>Remote</option>
            <option>Hybrid</option>
            <option>On-site</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[#849394]"><Icon name="chevron" size={15} /></span>
        </div>
        <fieldset className="mt-5 flex flex-col gap-2.75 border-0 p-0">
          <legend className="mb-1.25 w-full text-[11px] font-semibold text-[#66787a]">Employment type</legend>
          {["Full-time", "Part-time", "Contract", "Internship"].map((option) => (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[#596b6d]" key={option}>
              <input className="m-0 size-3.5 accent-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" type="checkbox" checked={employmentTypes.includes(option)} onChange={() => toggleEmploymentType(option)} />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      </aside>

      <div className="min-w-0">
        <div className="flex min-h-13.5 items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-bold tracking-[-0.35px] text-[#293d3e] max-[680px]:text-[17px]">Job opportunities</h2>
            <p className="mt-1.25 text-[11px] text-[#8a999a] max-[680px]:text-[10px]">{visibleJobs.length} roles available</p>
          </div>
          <label className="relative flex w-35.5 flex-none items-center max-[680px]:w-28">
            <span className="sr-only">Sort opportunities</span>
            <select className="h-9 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-7.25 pl-3 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] max-[680px]:h-8.5 max-[680px]:py-0 max-[680px]:pr-7.25 max-[680px]:pl-2.25 max-[680px]:text-[10px]" defaultValue="Most recent">
              <option>Most recent</option>
              <option>Salary: high to low</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 text-[#849394]"><Icon name="chevron" size={15} /></span>
          </label>
        </div>

        <div className="flex flex-col gap-5.5 max-[680px]:gap-2.5">
          {visibleJobs.map((job) => (
            <article
              aria-label={`View ${job.company} company profile`}
              className="cursor-pointer overflow-hidden rounded-[13px] border border-[#dcebea] bg-white shadow-[0_3px_10px_rgba(39,85,82,0.025)] transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none hover:border-[#b9dcda] hover:shadow-[0_7px_18px_rgba(39,85,82,0.07)] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
              key={job.id}
              onClick={() => navigate(getCompanyProfileUrl(job.company))}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  navigate(getCompanyProfileUrl(job.company));
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div className="flex items-start gap-3 px-4.25 py-5.5 max-[680px]:gap-2.5 max-[680px]:p-[13px_12px]">
                <div className="grid size-10.5 flex-none place-items-center rounded-[10px] border border-[#e5efed] bg-[#078b8d] text-[18px] font-bold text-white max-[680px]:size-8.5 max-[680px]:rounded-[9px]">{job.initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3.5">
                    <div>
                      <h3 className="text-[20px] font-bold tracking-[-0.15px] text-[#2b3e3f]">{job.title}</h3>
                      <p className="mt-1 text-[15px] font-medium text-[#647779]">{job.company}</p>
                    </div>
                    <button className={`inline-flex size-5.5 flex-none items-center justify-center rounded border border-transparent text-[#859596] hover:border-[#b9ddda] hover:bg-[#eff9f7] hover:text-[#078789] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px] ${savedJobs.includes(job.id) ? "border-[#b9ddda] bg-[#eff9f7] text-[#078789] [&_svg]:fill-[#bfe8e2]" : ""}`} aria-label={savedJobs.includes(job.id) ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`} onClick={(event) => { event.stopPropagation(); toggleSaved(job.id); }}>
                      <Icon name="bookmark" size={19} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.75 text-[13px] text-[#778789] max-[680px]:text-[9px]">
                    <span className="inline-flex items-center gap-1"><Icon name="pin" size={15} />{job.location}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="briefcase" size={15} />{job.arrangement}</span>
                    <span className="font-semibold text-[#1b7776] max-[680px]:basis-full">{job.salary}</span>
                  </div>
                  <p className="my-2 text-[12px] leading-[1.45] text-[#748385]">{job.description}</p>
                  <div className="flex flex-wrap gap-1.25">
                    {job.skills.map((skill) => <span className="rounded-sm bg-[#eff6f5] px-1.75 py-1 text-[12px] font-medium text-[#54797a] max-[680px]:text-[9px]" key={skill}>{skill}</span>)}
                  </div>
                  <div className="mt-2.25 flex items-center justify-end gap-3">
                    <span className="whitespace-nowrap text-[9px] text-[#9aa6a7]">{job.posted}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {visibleJobs.length === 0 ? (
            <div className="rounded-[13px] border border-dashed border-[#cadbda] bg-white px-5 py-12.5 text-center">
              <span className="inline-grid size-10.5 place-items-center rounded-[13px] bg-[#e6f4f1] text-[#188b8a]"><Icon name="search" size={22} /></span>
              <h3 className="mt-3.5 mb-1.25 text-[15px] text-[#203638]">No matching opportunities</h3>
              <p className="text-xs text-[#718184]">Try another job title, skill, or company.</p>
              <button className="mt-3.5 text-xs font-semibold text-[#087879] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]" onClick={() => { onSearchChange(""); onLocationChange(""); }}>Clear search</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
