import { statCards } from "@/features/employer-overview/constants";

export default function OverviewStatsSection() {
  return (
    <section aria-label="Employer statistics" className="mt-5 grid grid-cols-4 gap-3 max-[620px]:grid-cols-2">
      {statCards.map(({ label, value, detail, accent }) => (
        <article
          className="rounded-[16px] border border-[#edf1f1] bg-white p-4 shadow-[0_8px_24px_rgba(34,66,65,0.05)]"
          key={label}
        >
          <p className={`text-[22px] leading-none font-bold ${accent}`}>{value}</p>
          <p className="mt-2 text-[10px] font-medium text-[#829091]">{label}</p>
          <p className="mt-1 text-[9px] text-[#99a6a6]">{detail}</p>
        </article>
      ))}
    </section>
  );
}
