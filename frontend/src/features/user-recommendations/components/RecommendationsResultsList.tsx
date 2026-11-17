import { OjtOpportunityCard } from "@/components/common/user/ojtOpportunityComponents";
import { RecommendedJobCard } from "@/components/common/user/recommendationComponents";
import type { ScoredOjtOpportunity } from "@/features/jobs/ojtMatching";
import type { RecommendedJob } from "@/components/common/user/recommendationComponents";

type RecommendationItem =
  | {
      type: "job";
      key: string;
      score: number;
      postedHoursAgo: number;
      job: RecommendedJob;
    }
  | {
      type: "ojt";
      key: string;
      score: number;
      postedHoursAgo: number;
      opportunity: ScoredOjtOpportunity;
    };

type RecommendationsResultsListProps = {
  bestMatchJobId: string | number | null;
  showSavedOnly: boolean;
  visibleRecommendations: RecommendationItem[];
};

export default function RecommendationsResultsList({
  bestMatchJobId,
  showSavedOnly,
  visibleRecommendations,
}: RecommendationsResultsListProps) {
  return (
    <div className="mt-4 flex flex-col gap-[14px]">
      {visibleRecommendations.map((recommendation) =>
        recommendation.type === "job" ? (
          <RecommendedJobCard
            isBestMatch={bestMatchJobId === recommendation.job.id}
            job={recommendation.job}
            key={recommendation.key}
          />
        ) : (
          <OjtOpportunityCard
            key={recommendation.key}
            opportunity={recommendation.opportunity}
            showMatchScore
          />
        ),
      )}
      {visibleRecommendations.length === 0 && (
        <div className="rounded-[13px] border border-dashed border-[#cadbda] bg-white px-5 py-[50px] text-center">
          <h3 className="text-[15px] font-semibold text-[#203638]">
            {showSavedOnly ? "No saved opportunities" : "No matching opportunities"}
          </h3>
          <p className="mt-1 text-xs text-[#718184]">
            {showSavedOnly
              ? "Bookmark an offer to keep it here for later."
              : "Check back soon for new opportunities."}
          </p>
        </div>
      )}
    </div>
  );
}
