import { Link } from "react-router";
import { pipeline } from "@/features/employer-overview/constants";

type HiringPipelineCardProps = {
  maximumPipelineCount: number;
};

export default function HiringPipelineCard({ maximumPipelineCount }: HiringPipelineCardProps) {
  return (
    <article className="rounded-[16px] border border-[#edf1f1] bg-white p-5 shadow-[0_8px_24px_rgba(34,66,65,0.05)] max-[680px]:p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-[#344749]">Hiring pipeline</h2>
          <p className="mt-1 text-[10px] text-[#849293]">
            Applicant progress across your open roles
          </p>
        </div>
        <Link
          className="text-[10px] font-semibold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
          to="/employer/applicants"
        >
          View all
        </Link>
      </div>
      <div className="space-y-4">
        {pipeline.map(({ label, count, color }) => (
          <div
            className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1fr)_32px] items-center gap-3 text-[10px]"
            key={label}
          >
            <span className="text-[#687b7e]">{label}</span>
            <div
              aria-label={`${label}: ${count}`}
              className="h-2 overflow-hidden rounded-full bg-[#edf2f1]"
              role="meter"
              aria-valuenow={count}
              aria-valuemin={0}
              aria-valuemax={maximumPipelineCount}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(count / maximumPipelineCount) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-right font-semibold text-[#344749]">{count}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
