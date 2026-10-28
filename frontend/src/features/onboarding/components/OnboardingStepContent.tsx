import RoleStep from "@/components/features/onboarding/shared/roleStep";
import JobStep2 from "@/components/features/onboarding/tracks/job/steps/jobStep2";
import JobStep3 from "@/components/features/onboarding/tracks/job/steps/jobStep3";
import JobStep4 from "@/components/features/onboarding/tracks/job/steps/jobStep4";
import JobStep5 from "@/components/features/onboarding/tracks/job/steps/jobStep5";
import JobStep6 from "@/components/features/onboarding/tracks/job/steps/jobStep6";
import JobStep7 from "@/components/features/onboarding/tracks/job/steps/jobStep7";
import OjtStep3 from "@/components/features/onboarding/tracks/ojt/steps/ojtStep3";
import OjtStep4 from "@/components/features/onboarding/tracks/ojt/steps/ojtStep4";
import OjtStep5 from "@/components/features/onboarding/tracks/ojt/steps/ojtStep5";
import OjtStep7 from "@/components/features/onboarding/tracks/ojt/steps/ojtStep7";
import type { OnboardingStepId } from "@/features/onboarding/config/steps";
import type { OnboardingErrors } from "@/features/onboarding/schemas";
import type { OnboardingAnswers } from "@/features/onboarding/store";

type OnboardingStepContentProps = {
  stepId: OnboardingStepId;
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  accountCreated: boolean;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
  onToggleList: (
    field:
      | "trainingFields"
      | "jobCategories"
      | "desiredJobTitles"
      | "employmentTypes"
      | "skills"
      | "preferredLocations",
    value: string,
  ) => void;
  onEdit: (step: OnboardingStepId) => void;
};

export default function OnboardingStepContent({
  stepId,
  answers,
  errors,
  accountCreated,
  onChange,
  onToggleList,
  onEdit,
}: OnboardingStepContentProps) {
  switch (stepId) {
    case "create-account":
      return (
        <JobStep2
          answers={answers}
          disabled={accountCreated}
          errors={errors}
          onChange={onChange}
        />
      );
    case "job-interests":
      return (
        <JobStep3
          answers={answers}
          errors={errors}
          onToggleList={onToggleList}
        />
      );
    case "job-skills":
      return (
        <JobStep4
          answers={answers}
          errors={errors}
          onToggleList={onToggleList}
          onChange={onChange}
        />
      );
    case "job-preferences":
      return (
        <JobStep5
          answers={answers}
          errors={errors}
          onChange={onChange}
          onToggleList={onToggleList}
        />
      );
    case "school":
      return (
        <OjtStep3
          answers={answers}
          errors={errors}
          onChange={onChange}
          onToggleList={onToggleList}
        />
      );
    case "interests":
      return (
        <OjtStep4
          answers={answers}
          errors={errors}
          onChange={onChange}
          onToggleList={onToggleList}
        />
      );
    case "preferences":
      return (
        <OjtStep5
          answers={answers}
          errors={errors}
          onChange={onChange}
          onToggleList={onToggleList}
        />
      );
    case "resume":
      return (
        <JobStep6
          answers={answers}
          onChange={onChange}
        />
      );
    case "review":
      return answers.goal === "job-seeker" ? (
        <JobStep7 answers={answers} onEdit={onEdit} />
      ) : (
        <OjtStep7 answers={answers} onEdit={onEdit} />
      );
    case "goal":
      return <RoleStep answers={answers} errors={errors} onChange={onChange} />;
  }
}
