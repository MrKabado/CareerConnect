import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import HiringPipelineCard from "@/features/employer-overview/components/HiringPipelineCard";
import OverviewHeader from "@/features/employer-overview/components/OverviewHeader";
import OverviewStatsSection from "@/features/employer-overview/components/OverviewStatsSection";
import { useEmployerOverview } from "@/features/employer-overview/hooks/useEmployerOverview";
import { Link } from "react-router";

export default function EmployerOverviewPageContent() {
  const { companyName, maximumPipelineCount, pipeline, stats, isLoading, error, retry } = useEmployerOverview();

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto w-full max-w-[1136px] flex-1 px-10 max-[920px]:px-6 max-[680px]:px-4">
        <OverviewHeader companyName={companyName} />

        <ErrorBoundary>
          <OverviewStatsSection
            error={error}
            isLoading={isLoading}
            onRetry={retry}
            stats={stats}
          />
        </ErrorBoundary>

        <section className="grid items-start gap-3 py-4">
          <ErrorBoundary>
            <HiringPipelineCard maximumPipelineCount={maximumPipelineCount} pipeline={pipeline} />
          </ErrorBoundary>
        </section>

        {stats.recommendations && stats.recommendations.length > 0 ? (
          <section aria-labelledby="employer-recommendations-heading" className="mb-4 rounded-xl border border-[#e5eeec] bg-white p-4">
            <h2 id="employer-recommendations-heading" className="text-sm font-semibold text-[#263638]">Recommendations</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {stats.recommendations.map((recommendation) => (
                <Link
                  className="rounded-lg border border-[#e5eeec] bg-[#fbfdfd] p-3 hover:border-[#b9dcda]"
                  key={recommendation.id}
                  to={recommendation.action}
                >
                  <p className="text-xs font-semibold text-[#263638]">{recommendation.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#718181]">{recommendation.message}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </EmployerWorkspaceLayout>
  );
}
