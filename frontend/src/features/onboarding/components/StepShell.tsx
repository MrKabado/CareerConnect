import type { FormEventHandler, ReactNode } from "react";
import {
  jobOnboardingSteps,
  onboardingSteps,
  type OnboardingStepId,
} from "@/features/onboarding/config/steps";
import BackContinueBar from "@/features/onboarding/components/BackContinueBar";

type StepShellProps = {
  children: ReactNode;
  stepId: OnboardingStepId;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSaveLater?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function StepShell({
  children,
  stepId,
  isFirstStep,
  isLastStep,
  isSubmitting,
  submitError,
  onBack,
  onSaveLater,
  onSkip,
  skipLabel,
  onSubmit,
}: StepShellProps) {
  const step = onboardingSteps.find((item) => item.id === stepId);
  const jobStep = jobOnboardingSteps.find((item) => item.id === stepId);
  const stepDetails = step ?? jobStep;
  if (!stepDetails) {
    throw new Error(`Unknown onboarding step: ${stepId}`);
  }

  return (
    <section className="w-full overflow-hidden rounded-[16px] bg-white shadow-[0_10px_28px_rgba(31,67,65,0.08)] max-[600px]:rounded-[14px]">
      <header className="bg-[linear-gradient(112deg,#eef9f7_0%,#f0faf8_62%,#d8f4ef_100%)] px-8 py-6 max-[600px]:px-5 max-[600px]:py-3.5">
        <span className="inline-flex rounded-md bg-[#e1f5f2] px-2.5 py-1 text-[10px] font-semibold text-[#087f87]">
          {stepDetails.eyebrow}
        </span>
        <h1 className="mt-3 text-[26px] leading-tight font-bold tracking-[-0.8px] text-[#263538] max-[600px]:mt-2 max-[600px]:text-[20px]">
          {stepDetails.title}
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-[#718082] max-[600px]:mt-1 max-[600px]:text-[11px] max-[600px]:leading-4">
          {stepDetails.description}
        </p>
      </header>

      <div className="px-8 pt-7 pb-6 max-[600px]:px-5 max-[600px]:pt-4 max-[600px]:pb-4">
        <form noValidate onSubmit={onSubmit}>
          {children}
          {submitError && (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {submitError}
            </p>
          )}
          <BackContinueBar
            canGoBack={!isFirstStep}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
            onBack={onBack}
            onSaveLater={onSaveLater}
            onSkip={onSkip}
            skipLabel={skipLabel}
          />
        </form>
      </div>
    </section>
  );
}
