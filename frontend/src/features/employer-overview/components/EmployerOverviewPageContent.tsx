import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import HiringPipelineCard from "@/features/employer-overview/components/HiringPipelineCard";
import HiringSetupCard from "@/features/employer-overview/components/HiringSetupCard";
import OverviewHeader from "@/features/employer-overview/components/OverviewHeader";
import OverviewStatsSection from "@/features/employer-overview/components/OverviewStatsSection";
import { useEmployerOverview } from "@/features/employer-overview/hooks/useEmployerOverview";

export default function EmployerOverviewPageContent() {
  const { companyName, maximumPipelineCount } = useEmployerOverview();

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto w-full max-w-[1136px] flex-1 px-10 max-[920px]:px-6 max-[680px]:px-4">
        <OverviewHeader companyName={companyName} />

        <ErrorBoundary>
          <OverviewStatsSection />
        </ErrorBoundary>

        <section className="grid items-start gap-3 py-4 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
          <ErrorBoundary>
            <HiringPipelineCard maximumPipelineCount={maximumPipelineCount} />
          </ErrorBoundary>

          <ErrorBoundary>
            <HiringSetupCard />
          </ErrorBoundary>
        </section>
      </main>
    </EmployerWorkspaceLayout>
  );
}
