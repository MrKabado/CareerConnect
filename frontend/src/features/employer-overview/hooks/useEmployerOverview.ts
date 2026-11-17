import { pipeline } from "@/features/employer-overview/constants";
import { useEmployerStatus } from "@/features/employer-registration/useEmployerStatus";

export function useEmployerOverview() {
  const { employer } = useEmployerStatus();
  const companyName = employer?.companyName || "Maya Philippines";
  const maximumPipelineCount = Math.max(...pipeline.map(({ count }) => count));

  return {
    companyName,
    maximumPipelineCount,
  };
}
