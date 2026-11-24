import { OjtChoice, OjtField } from "@/components/features/onboarding/tracks/ojt/steps/ojtStepTypes";
import type { OnboardingAnswers } from "@/features/onboarding/store";
import type { OnboardingErrors } from "@/features/onboarding/schemas";

const categories = [
  "Information Technology",
  "Customer Service / BPO",
  "Accounting & Finance",
  "Engineering",
  "Healthcare",
  "Education",
  "Sales & Marketing",
  "Design & Creative",
  "Administration",
  "Hospitality",
];

type JobStep3Props = {
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  onToggleList: (
    field: "jobCategories",
    value: string,
  ) => void;
};

export default function JobStep3({
  answers,
  errors,
  onToggleList,
}: JobStep3Props) {
  return (
    <OjtField
      error={errors.jobCategories}
      label={
        <span className="flex items-center justify-between gap-3">
          <span>
            Job categories <span className="text-[#d34c4c]">*</span>
          </span>
          <span className="font-normal text-[#9ba6a7]">
            {answers.jobCategories.length}/5 selected
          </span>
        </span>
      }
    >
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <OjtChoice
            active={answers.jobCategories.includes(category)}
            key={category}
            onClick={() => onToggleList("jobCategories", category)}
          >
            {category}
          </OjtChoice>
        ))}
      </div>
    </OjtField>
  );
}