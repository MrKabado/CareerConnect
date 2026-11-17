import type { FormEventHandler } from "react";
import ProgressBar from "@/features/onboarding/components/ProgressBar";
import StepShell from "@/features/onboarding/components/StepShell";
import { useOnboarding } from "@/features/onboarding/useOnboarding";
import OnboardingComplete from "./OnboardingComplete";
import OnboardingStepContent from "./OnboardingStepContent";

type OnboardingPageViewProps = {
  onboarding: ReturnType<typeof useOnboarding>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSkipResume: () => void;
  onSeeRecommendations: () => void;
};

export default function OnboardingPageView({
  onboarding,
  onSubmit,
  onSkipResume,
  onSeeRecommendations,
}: OnboardingPageViewProps) {
  if (onboarding.isComplete) {
    return (
      <OnboardingComplete
        answers={onboarding.answers}
        onSeeRecommendations={onSeeRecommendations}
      />
    );
  }

  const step = onboarding.steps[onboarding.currentIndex];
  const skipHandler = step.id === "resume" ? onSkipResume : undefined;
  const saveLaterHandler =
    step.id !== "goal" && step.id !== "create-account"
      ? onboarding.saveForLater
      : undefined;

  return (
    <div className="w-full max-w-157 max-[600px]:max-w-108">
      <ProgressBar
        currentStep={onboarding.currentIndex + 1}
        totalSteps={onboarding.totalSteps}
      />
      <div className="mt-6 max-[600px]:mt-4">
        <StepShell
          stepId={step.id}
          isFirstStep={onboarding.isFirstStep}
          isLastStep={onboarding.isLastStep}
          isSubmitting={onboarding.isSubmitting}
          onBack={onboarding.back}
          onSaveLater={saveLaterHandler}
          onSkip={skipHandler}
          onSubmit={onSubmit}
          skipLabel={step.id === "resume" ? "Skip for now" : undefined}
          submitError={onboarding.submitError}
        >
          <OnboardingStepContent
            accountCreated={onboarding.accountCreated}
            answers={onboarding.answers}
            errors={onboarding.errors}
            onChange={onboarding.setAnswer}
            onEdit={onboarding.setStep}
            onToggleList={onboarding.toggleListAnswer}
            stepId={step.id}
          />
        </StepShell>
      </div>
      <p className="mt-5 text-center text-[10px] text-[#a2acad] max-[600px]:mt-3 max-[600px]:text-[9px]">
        Your information is private and only shared when you apply.
      </p>
    </div>
  );
}
