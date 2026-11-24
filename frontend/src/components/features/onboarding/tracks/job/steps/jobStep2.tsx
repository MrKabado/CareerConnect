import OjtStep2 from "@/components/features/onboarding/tracks/ojt/steps/ojtStep2";
import type { OnboardingAnswers } from "@/features/onboarding/store";
import type { OnboardingErrors } from "@/features/onboarding/schemas";

type JobStep2Props = {
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  disabled?: boolean;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
};

export default function JobStep2(props: JobStep2Props) {
  return <OjtStep2 {...props} />;
}