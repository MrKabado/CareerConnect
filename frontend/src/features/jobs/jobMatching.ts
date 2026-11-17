import type { JobListing } from "@/features/jobs/jobListings";
import type { OnboardingAnswers } from "@/features/onboarding/store";

type MatchFactor = {
  label: string;
  weight: number;
  score: number;
};

export type JobMatch = {
  score: number;
  reasons: string[];
};

export function textSimilarity(left: string, right: string) {
  const leftWords = new Set(
    left.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [],
  );
  const rightWords = new Set(
    right.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [],
  );
  const smallerSetSize = Math.min(leftWords.size, rightWords.size);

  if (smallerSetSize === 0) return 0;

  const sharedWords = [...leftWords].filter((word) => rightWords.has(word)).length;
  return sharedWords / smallerSetSize;
}

export function getJobMatch(
  job: JobListing,
  answers: OnboardingAnswers,
): JobMatch | null {
  const factors: MatchFactor[] = [];

  if (answers.desiredJobTitles.length > 0) {
    factors.push({
      label: "desired roles",
      weight: 35,
      score: Math.max(
        ...answers.desiredJobTitles.map((title) =>
          textSimilarity(title, job.title),
        ),
      ),
    });
  }

  if (answers.skills.length > 0) {
    const matchedSkills = answers.skills.filter((skill) =>
      job.skills.some((jobSkill) => textSimilarity(skill, jobSkill) === 1),
    ).length;
    factors.push({
      label: "skills",
      weight: 35,
      score: matchedSkills / answers.skills.length,
    });
  }

  if (answers.jobCategories.length > 0) {
    factors.push({
      label: "job interests",
      weight: 20,
      score: Math.max(
        ...answers.jobCategories.map((category) =>
          textSimilarity(category, job.category),
        ),
      ),
    });
  }

  if (answers.workSetup) {
    factors.push({
      label: "work setup",
      weight: 5,
      score: textSimilarity(answers.workSetup, job.arrangement) === 1 ? 1 : 0,
    });
  }

  if (answers.preferredLocations.length > 0) {
    factors.push({
      label: "location",
      weight: 5,
      score: Math.max(
        ...answers.preferredLocations.map((location) =>
          textSimilarity(location, job.location),
        ),
      ),
    });
  }

  if (factors.length === 0) return null;

  const totalWeight = factors.reduce((total, factor) => total + factor.weight, 0);
  const weightedScore = factors.reduce(
    (total, factor) => total + factor.weight * factor.score,
    0,
  );

  return {
    score: Math.round((weightedScore / totalWeight) * 100),
    reasons: factors
      .filter((factor) => factor.score > 0)
      .map((factor) => factor.label),
  };
}
