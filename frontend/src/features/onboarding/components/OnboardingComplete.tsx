import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";
import type { OnboardingAnswers } from "@/features/onboarding/store";

type OnboardingCompleteProps = {
  answers: OnboardingAnswers;
  onSeeRecommendations: () => void;
};

export default function OnboardingComplete({
  answers,
  onSeeRecommendations,
}: OnboardingCompleteProps) {
  return (
    <section className="w-full max-w-140 rounded-[22px] border border-[#e6eeee] bg-white px-8 py-10 text-center shadow-[0_16px_50px_rgba(27,75,72,0.08)] max-[600px]:px-5 max-[600px]:py-8">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#e6f7f4] text-[#078b8d]">
        <svg aria-hidden="true" className="size-8" fill="none" viewBox="0 0 24 24">
          <path
            d="m5 12.5 4.5 4.5L19 7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
      {answers.goal === "job-seeker" && (
        <span className="mt-2 inline-flex rounded-md bg-[#fff4df] px-2.5 py-1 text-[10px] font-semibold text-[#a66b19]">
          Profile ready
        </span>
      )}
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#078b8d]">
        CareerConnect
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.8px] text-[#263538]">
        You’re all set!
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#718082]">
        {answers.goal === "job-seeker"
          ? "We’ll use your goals and preferences to surface opportunities that are a better fit for you."
          : "Your profile setup is ready. Verify your email to activate your account."}
      </p>
      <p className="mt-3 rounded-xl bg-[#fff9e9] px-4 py-3 text-left text-xs leading-5 text-[#75633a]">
        Your profile answers are not yet saved to your account. They remain
        available in this browser session only.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[
          ...(answers.goal === "job-seeker"
            ? answers.jobCategories
            : answers.trainingFields),
          ...(answers.goal === "job-seeker" ? answers.skills.slice(0, 1) : []),
          ...(answers.goal === "job-seeker" && answers.workSetup
            ? [answers.workSetup]
            : []),
        ].map((field) => (
          <span
            className="rounded-full bg-[#edf9f7] px-3 py-1.5 text-xs font-medium text-[#087f87]"
            key={field}
          >
            {field}
          </span>
        ))}
      </div>
      <OnboardingButton
        className="mt-7"
        onClick={onSeeRecommendations}
        type="button"
      >
        See my recommendations
      </OnboardingButton>
    </section>
  );
}
