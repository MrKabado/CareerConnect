import { useMemo, useState, useSyncExternalStore } from "react";
import type { RecommendedJob } from "@/components/common/user/recommendationComponents";
import { useAuth } from "@/features/auth/useAuth";
import { jobListings } from "@/features/jobs/jobListings";
import { getJobMatch } from "@/features/jobs/jobMatching";
import { getOjtMatch } from "@/features/jobs/ojtMatching";
import type { ScoredOjtOpportunity } from "@/features/jobs/ojtMatching";
import { ojtOpportunities } from "@/components/common/user/ojtOpportunityData";
import { onboardingStore } from "@/features/onboarding/store";
import { ojtProfileExample } from "@/features/onboarding/ojtProfileExample";
import { savedOpportunityStore } from "@/features/jobs/savedOpportunities";

export type RecommendationSort = "best-match" | "most-recent";

export type CombinedRecommendation =
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

export function useUserRecommendations() {
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

  return {
    bestMatchJobId,
    combinedRecommendations,
    firstName,
    hasJobSeekerPreferences,
    noticeDismissed,
    ojtRecommendations,
    recommendations,
    setNoticeDismissed,
    setShowSavedOnly,
    setSort,
    showSavedOnly,
    sort,
    user,
    verificationEmail,
    visibleRecommendations,
    savedOpportunities,
  };
}
