import OnboardingButton from "@/components/features/onboarding/shared/onboardingbutton";

type BackContinueBarProps = {
  canGoBack: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onSaveLater?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
};

export default function BackContinueBar({
  canGoBack,
  isLastStep,
  isSubmitting,
  onBack,
  onSaveLater,
  onSkip,
  skipLabel = "Skip for now",
}: BackContinueBarProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#e7eeee] pt-5 max-[600px]:mt-5 max-[600px]:pt-3">
      <OnboardingButton
        disabled={!canGoBack || isSubmitting}
        onClick={onBack}
        type="button"
        className="max-[600px]:h-7 max-[600px]:px-3 max-[600px]:text-[10px]"
        variant="back"
      >
        <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
          <path
            d="M12.5 4.5 7 10l5.5 5.5M7.5 10H17"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
        Back
      </OnboardingButton>

      <div className="flex items-center gap-2">
        {onSkip && (
          <OnboardingButton
            className="max-[600px]:h-7 max-[600px]:px-3 max-[600px]:text-[10px]"
            disabled={isSubmitting}
            onClick={onSkip}
            type="button"
            variant="secondary"
          >
            {skipLabel}
          </OnboardingButton>
        )}
        {onSaveLater && (
          <OnboardingButton
            className="max-[700px]:hidden"
            disabled={isSubmitting}
            onClick={onSaveLater}
            type="button"
            variant="secondary"
          >
            Save & finish later
          </OnboardingButton>
        )}
        <OnboardingButton
          className="max-[600px]:h-7 max-[600px]:px-4 max-[600px]:text-[10px]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving…" : isLastStep ? "Finish" : "Continue"}
          <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
            <path
              d="M3 10h13m-5-5 5 5-5 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </OnboardingButton>
      </div>
    </div>
  );
}
