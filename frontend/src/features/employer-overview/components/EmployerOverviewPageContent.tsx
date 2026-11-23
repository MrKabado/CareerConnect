import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import DashboardActivitySections from "@/features/employer-overview/components/DashboardActivitySections";
import HiringPipelineCard from "@/features/employer-overview/components/HiringPipelineCard";
import OverviewHeader from "@/features/employer-overview/components/OverviewHeader";
import OverviewStatsSection from "@/features/employer-overview/components/OverviewStatsSection";
import { useEmployerOverview } from "@/features/employer-overview/hooks/useEmployerOverview";

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

        <ErrorBoundary>
          <DashboardActivitySections
            error={error}
            isLoading={isLoading}
            onRetry={retry}
            stats={stats}
          />
        </ErrorBoundary>
      </main>
    </EmployerWorkspaceLayout>
  );
}
