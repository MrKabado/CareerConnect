import type { OnboardingAnswers } from "@/features/onboarding/store";
import type { OnboardingErrors } from "@/features/onboarding/schemas";

type AccountTypeStepProps = {
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
};

const accountTypes = [
  {
    value: "applicant",
    title: "Find my next opportunity",
    description: "Discover roles and connect with employers.",
  },
  {
    value: "employer",
    title: "Hire great people",
    description: "Find candidates and grow your team.",
  },
] as const;

export default function AccountTypeStep({
  answers,
  errors,
  onChange,
}: AccountTypeStepProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-[#354346]">
        I’m here as a…
      </legend>
      <div className="grid gap-3">
        {accountTypes.map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              answers.role === option.value
                ? "border-[#078b8d] bg-[#f1fafa]"
                : "border-[#e2eaea] hover:border-[#b8cece]"
            }`}
            key={option.value}
          >
            <input
              checked={answers.role === option.value}
              className="mt-1 size-4 accent-[#078b8d]"
              name="role"
              onChange={() => onChange("role", option.value)}
              type="radio"
              value={option.value}
            />
            <span>
              <span className="block text-sm font-semibold text-[#354346]">
                {option.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#718082]">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      {errors.role && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {errors.role}
        </p>
      )}
    </fieldset>
  );
}
