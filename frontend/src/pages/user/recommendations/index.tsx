import { useMemo, useState, useSyncExternalStore } from "react";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import {
  EmailVerificationNotice,
  MatchingExplainer,
  RecommendedJobCard,
  type RecommendedJob,
} from "@/components/common/user/recommendationComponents";
import { jobListings } from "@/features/jobs/jobListings";
import { getJobMatch } from "@/features/jobs/jobMatching";
import { getOjtMatch } from "@/features/jobs/ojtMatching";
import type { ScoredOjtOpportunity } from "@/features/jobs/ojtMatching";
import { ojtOpportunities } from "@/components/common/user/ojtOpportunityData";
import { OjtOpportunityCard } from "@/components/common/user/ojtOpportunityComponents";
import { useAuth } from "@/features/auth/useAuth";
import { onboardingStore } from "@/features/onboarding/store";
import { ojtProfileExample } from "@/features/onboarding/ojtProfileExample";
import { savedOpportunityStore } from "@/features/jobs/savedOpportunities";

type RecommendationSort = "best-match" | "most-recent";

type CombinedRecommendation =
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

function getPostedHoursAgo(posted: string) {
  if (posted.toLocaleLowerCase() === "today") return 0;
  const match = posted.match(/^(\d+)\s+(hour|day|week)s?\s+ago$/i);
  if (!match) return Number.POSITIVE_INFINITY;

  const amount = Number(match[1]);
  const unit = match[2].toLocaleLowerCase();
  return amount * (unit === "hour" ? 1 : unit === "day" ? 24 : 168);
}

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [sort, setSort] = useState<RecommendationSort>("best-match");
  const [showSavedOnly, setShowSavedOnly] = useState(
    () => new URLSearchParams(window.location.search).get("saved") === "1",
  );
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const answers = onboarding.answers;
  const savedOpportunities = useSyncExternalStore(
    savedOpportunityStore.subscribe,
    savedOpportunityStore.getSnapshot,
    () => [],
  );
  const hasJobSeekerPreferences =
    onboarding.isComplete &&
    answers.goal === "job-seeker" &&
    (answers.desiredJobTitles.length > 0 ||
      answers.skills.length > 0 ||
      answers.jobCategories.length > 0 ||
      Boolean(answers.workSetup) ||
      answers.preferredLocations.length > 0);

  const recommendations = useMemo(() => {
    const matchingJobs: RecommendedJob[] = jobListings.map((job) => {
      const match = hasJobSeekerPreferences ? getJobMatch(job, answers) : null;

      return {
        ...job,
        matchScore: match?.score ?? 0,
        matchReasons: match?.reasons ?? [],
      };
    });

    return matchingJobs.sort((left, right) =>
      sort === "most-recent"
        ? left.postedHoursAgo - right.postedHoursAgo
        : (right.matchScore ?? -1) - (left.matchScore ?? -1),
    );
  }, [answers, hasJobSeekerPreferences, sort]);

  const ojtRecommendations = useMemo(() => {
    const ojtAnswers = {
      ...answers,
      course: answers.course || ojtProfileExample.course,
      requiredOjtHours:
        answers.requiredOjtHours || ojtProfileExample.requiredOjtHours,
      skills:
        answers.skills.length > 0 ? answers.skills : ojtProfileExample.skills,
      trainingFields:
        answers.trainingFields.length > 0
          ? answers.trainingFields
          : ojtProfileExample.trainingFields,
      workSetup: answers.workSetup || ojtProfileExample.workSetup,
      allowancePreference:
        answers.allowancePreference || ojtProfileExample.allowancePreference,
      preferredLocations:
        answers.preferredLocations.length > 0
          ? answers.preferredLocations
          : ojtProfileExample.preferredLocations,
    };

    return ojtOpportunities
      .map((opportunity) => getOjtMatch(opportunity, ojtAnswers))
      .filter((opportunity) => opportunity !== null)
      .sort((left, right) => right.matchScore - left.matchScore);
  }, [answers]);

  const combinedRecommendations = useMemo(() => {
    const combined: CombinedRecommendation[] = [
      ...recommendations.map((job) => ({
        type: "job" as const,
        key: `job-${job.id}`,
        score: job.matchScore ?? 0,
        postedHoursAgo: job.postedHoursAgo,
        job,
      })),
      ...ojtRecommendations.map((opportunity) => ({
        type: "ojt" as const,
        key: `ojt-${opportunity.id}`,
        score: opportunity.matchScore,
        postedHoursAgo: getPostedHoursAgo(opportunity.posted),
        opportunity,
      })),
    ];

    return combined.sort((left, right) =>
      sort === "most-recent"
        ? left.postedHoursAgo - right.postedHoursAgo
        : right.score - left.score,
    );
  }, [ojtRecommendations, recommendations, sort]);
  const visibleRecommendations = useMemo(
    () =>
      showSavedOnly
        ? combinedRecommendations.filter((recommendation) =>
            savedOpportunities.includes(
              `${recommendation.type}:${recommendation.type === "job" ? recommendation.job.id : recommendation.opportunity.id}`,
            ),
          )
        : combinedRecommendations,
    [combinedRecommendations, savedOpportunities, showSavedOnly],
  );
  const bestMatchJobId =
    visibleRecommendations[0]?.type === "job" &&
    visibleRecommendations[0].job.matchScore !== null &&
    visibleRecommendations[0].job.matchScore >= 70
      ? visibleRecommendations[0].job.id
      : null;
  const firstName =
    (user?.name || answers.name).trim().split(/\s+/)[0] || "Jamie";
  const verificationEmail =
    user && !user.email_verified_at
      ? user.email
      : onboarding.accountCreated && !user
        ? answers.email
        : "";

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="flex-1">
        <section className="border-b border-[#deeeeb] bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] px-10 pt-9 pb-8 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:pt-6">
          <div className="mx-auto max-w-[1136px]">
            {verificationEmail && !noticeDismissed && (
              <EmailVerificationNotice
                email={verificationEmail}
                onDismiss={() => setNoticeDismissed(true)}
              />
            )}

            <section>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f4f1] px-2.5 py-1 text-[12px] font-semibold text-[#25827e]">
                  <span aria-hidden="true">✦</span>
                  Personalized for you
                </span>
                <h1 className="mt-2.5 text-[28px] font-bold leading-tight tracking-[-0.8px] text-[#293d3e] max-[680px]:text-[24px]">
                  Good day, {firstName}
                </h1>
                <p className="mt-1.5 text-[12px] text-[#7b8b8d]">
                  Fresh opportunities matched to your goals, skills, and preferred
                  work setup.
                </p>
              </div>
            </section>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1136px] px-10 pt-7 pb-8 max-[920px]:px-6 max-[680px]:px-4">
        <section aria-labelledby="best-matches-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                className="text-[17px] font-bold tracking-[-0.25px] text-[#344749]"
                id="best-matches-heading"
              >
                Recommended opportunities
              </h2>
              <p className="mt-1 text-[10px] text-[#92a0a1]">
                {combinedRecommendations.length} opportunities across jobs and OJT
                {hasJobSeekerPreferences || ojtRecommendations.length > 0
                  ? " · ranked using your profile"
                  : " · complete your profile for personalized matches"}
              </p>
            </div>
            <div className="flex items-center gap-2">
            <button
              aria-pressed={showSavedOnly}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-semibold focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${showSavedOnly ? "border-[#9ed2aa] bg-[#eaf6ed] text-[#237a42]" : "border-[#e5ebeb] bg-white text-[#66787a] hover:border-[#b9ddda]"}`}
              onClick={() => setShowSavedOnly((savedOnly) => !savedOnly)}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h12v17l-6-4-6 4V4Z" />
              </svg>
              Saved ({savedOpportunities.length})
            </button>
            <label className="relative flex w-[152px] items-center">
              <span className="sr-only">Sort recommendations</span>
              <select
                className="h-9 w-full appearance-none rounded-lg border border-[#e5ebeb] bg-white py-0 pr-[29px] pl-3 text-[11px] text-[#526466] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[3px]"
                onChange={(event) =>
                  setSort(
                    event.target.value === "most-recent"
                      ? "most-recent"
                      : "best-match",
                  )
                }
                value={sort}
              >
                <option value="best-match">Best match</option>
                <option value="most-recent">Most recent</option>
              </select>
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute right-[10px] size-[15px] text-[#849394]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>
            </div>
          </div>

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
        </section>

        <div className="mt-4">
          <MatchingExplainer />
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
