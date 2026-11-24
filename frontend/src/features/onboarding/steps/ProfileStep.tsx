import type { OnboardingAnswers } from "@/features/onboarding/store";
import type {
  OnboardingErrors,
  OnboardingField,
} from "@/features/onboarding/schemas";

type ProfileStepProps = {
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
};

export default function ProfileStep({
  answers,
  errors,
  onChange,
}: ProfileStepProps) {
  const field: OnboardingField = "name";

  return (
    <div>
      <label
        className="mb-2 block text-sm font-medium text-[#354346]"
        htmlFor={field}
      >
        Your name
      </label>
      <input
        autoComplete="name"
        className="h-11 w-full rounded-lg border border-[#dfe8e8] px-3.5 text-sm text-[#263538] outline-none transition placeholder:text-[#a0acad] focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
        id={field}
        maxLength={255}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder="Enter your name"
        value={answers.name}
      />
      {errors.name && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {errors.name}
        </p>
      )}
    </div>
  );
}
