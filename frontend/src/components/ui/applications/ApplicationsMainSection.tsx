import {
  FilterButton,
  SearchField,
  StatCard,
  type Application,
} from "@/components/ui/applications/applicationsComponent";

export type ApplicationFilter = "All applications" | "Job" | "OJT";

type ApplicationsMainSectionProps = {
  applications: Application[];
  filteredCount: number;
  filter: ApplicationFilter;
  search: string;
  onFilterChange: (filter: ApplicationFilter) => void;
  onSearchChange: (search: string) => void;
};

export default function ApplicationsMainSection({
  applications,
  filteredCount,
  filter,
  search,
  onFilterChange,
  onSearchChange,
}: ApplicationsMainSectionProps) {
  const inProgressCount = applications.filter((application) =>
    ["Under Review", "Shortlisted", "Interview Scheduled"].includes(
      application.status,
    ),
  ).length;
  const interviewCount = applications.filter(
    (application) => application.status === "Interview Scheduled",
  ).length;
  const hiredCount = applications.filter(
    (application) => application.status === "Hired",
  ).length;

  return (
    <section
      aria-labelledby="applications-heading"
      className="relative isolate py-8 max-[680px]:py-6 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-[#deeeeb] before:bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)]"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-[#e3f5f2] px-2.5 py-1 text-[9px] font-semibold text-[#188783]">
            ✦ Job and OJT applications
          </span>
          <h1
            className="mt-2 text-[25px] leading-tight font-bold tracking-[-0.8px] text-[#263638] max-[600px]:text-[22px]"
            id="applications-heading"
          >
            My Applications
          </h1>
          <p className="mt-1 text-[11px] text-[#849293]">
            Track your progress and stay on top of next steps.
          </p>
        </div>
        <SearchField onChange={onSearchChange} value={search} />
      </div>

      <div
        aria-label="Application statistics"
        className="mt-5 grid grid-cols-4 gap-3 max-[620px]:grid-cols-2"
      >
        <StatCard
          accent="text-[#354346]"
          label="Total applications"
          value={applications.length}
        />
        <StatCard
          accent="text-[#168b87]"
          label="In progress"
          value={inProgressCount}
        />
        <StatCard
          accent="text-[#354346]"
          label="Interview scheduled"
          value={interviewCount}
        />
        <StatCard accent="text-[#31a581]" label="Hired" value={hiredCount} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div
          aria-label="Filter applications"
          className="inline-flex rounded-lg bg-[#e9f1f0] p-1"
          role="group"
        >
          {(["All applications", "Job", "OJT"] as const).map((tab) => (
            <FilterButton
              active={filter === tab}
              key={tab}
              onClick={() => onFilterChange(tab)}
            >
              {tab}
            </FilterButton>
          ))}
        </div>
        <p className="text-[9px] text-[#99a6a6]">
          Showing {filteredCount} of {applications.length} applications
        </p>
      </div>
    </section>
  );
}
