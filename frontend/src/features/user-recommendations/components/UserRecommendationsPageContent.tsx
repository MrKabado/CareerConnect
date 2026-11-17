import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import { MatchingExplainer } from "@/components/common/user/recommendationComponents";
import type { ScoredOjtOpportunity } from "@/features/jobs/ojtMatching";
import type { RecommendationSort } from "@/features/user-recommendations/hooks/useUserRecommendations";
import RecommendationsResultsList from "./RecommendationsResultsList";
import RecommendationsToolbar from "./RecommendationsToolbar";
import UserRecommendationsHero from "./UserRecommendationsHero";
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

type UserRecommendationsPageContentProps = {
  bestMatchJobId: string | number | null;
  combinedRecommendations: RecommendationItem[];
  firstName: string;
  hasJobSeekerPreferences: boolean;
  noticeDismissed: boolean;
  ojtRecommendations: ScoredOjtOpportunity[];
  savedOpportunities: string[];
  setNoticeDismissed: (value: boolean) => void;
  setShowSavedOnly: (value: boolean | ((current: boolean) => boolean)) => void;
  setSort: (value: RecommendationSort) => void;
  showSavedOnly: boolean;
  sort: RecommendationSort;
  verificationEmail: string;
  visibleRecommendations: RecommendationItem[];
};

export default function UserRecommendationsPageContent({
  bestMatchJobId,
  combinedRecommendations,
  firstName,
  hasJobSeekerPreferences,
  noticeDismissed,
  ojtRecommendations,
  savedOpportunities,
  setNoticeDismissed,
  setShowSavedOnly,
  setSort,
  showSavedOnly,
  sort,
  verificationEmail,
  visibleRecommendations,
}: UserRecommendationsPageContentProps) {
  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="flex-1">
        <UserRecommendationsHero
          firstName={firstName}
          noticeDismissed={noticeDismissed}
          setNoticeDismissed={setNoticeDismissed}
          verificationEmail={verificationEmail}
        />

        <div className="mx-auto w-full max-w-[1136px] px-10 pt-7 pb-8 max-[920px]:px-6 max-[680px]:px-4">
          <section aria-labelledby="best-matches-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-bold tracking-[-0.25px] text-[#344749]" id="best-matches-heading">
                  Recommended opportunities
                </h2>
                <p className="mt-1 text-[10px] text-[#92a0a1]">
                  {combinedRecommendations.length} opportunities across jobs and OJT
                  {hasJobSeekerPreferences || ojtRecommendations.length > 0
                    ? " · ranked using your profile"
                    : " · complete your profile for personalized matches"}
                </p>
              </div>

              <RecommendationsToolbar
                savedOpportunitiesCount={savedOpportunities.length}
                setShowSavedOnly={setShowSavedOnly}
                setSort={setSort}
                showSavedOnly={showSavedOnly}
                sort={sort}
              />
            </div>

            <RecommendationsResultsList
              bestMatchJobId={bestMatchJobId}
              showSavedOnly={showSavedOnly}
              visibleRecommendations={visibleRecommendations}
            />
          </section>

          <div className="mt-6">
            <MatchingExplainer />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
