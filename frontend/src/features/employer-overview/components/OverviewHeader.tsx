import DashboardBadge from "@/features/employer-overview/components/DashboardBadge";

type OverviewHeaderProps = {
  companyName: string;
};

export default function OverviewHeader({ companyName }: OverviewHeaderProps) {
  return (
    <section
      aria-labelledby="employer-overview-heading"
      className="relative isolate py-8 max-[680px]:py-6 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-[#deeeeb] before:bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)]"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <DashboardBadge>Employer dashboard</DashboardBadge>
          <h1
            className="mt-2 text-[25px] leading-tight font-bold tracking-[-0.8px] text-[#263638] max-[600px]:text-[22px]"
            id="employer-overview-heading"
          >
            Good day, {companyName}
          </h1>
          <p className="mt-1 text-[11px] text-[#849293]">
            Here&apos;s what&apos;s happening with your hiring pipeline.
          </p>
        </div>
      </div>
    </section>
  );
}
