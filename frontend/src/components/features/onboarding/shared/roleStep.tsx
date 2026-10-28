import type { OnboardingAnswers } from "@/features/onboarding/store";
import type { OnboardingErrors } from "@/features/onboarding/schemas";

type RoleStepProps = {
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
};

const goals = [
  {
    value: "job-seeker",
    title: "Job Seeker",
    description: "Full-time, part-time, or contract roles",
  },
  {
    value: "ojt-seeker",
    title: "OJT Seeker",
    description: "On-the-job training required by your school",
  },
] as const;

function GoalIcon({ isOjt }: { isOjt: boolean }) {
  return isOjt ? (
    <svg
      aria-hidden="true"
      className="size-[19px]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        x="5"
        y="3.5"
        width="14"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9 17h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="size-[19px]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        x="4"
        y="7"
        width="16"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7M4.5 11h15M10 11v1.5h4V11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function RoleStep({ answers, errors, onChange }: RoleStepProps) {
  return (
    <div>
      <fieldset>
        <legend className="sr-only">What are you looking for?</legend>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          {goals.map((goal) => {
            const selected = answers.goal === goal.value;

            return (
              <label
                className={`relative flex min-h-[124px] cursor-pointer items-start gap-3.5 rounded-[15px] border px-[18px] py-[17px] transition ${
                  selected
                    ? "border-[#008f9b] bg-[#f0f9f8] shadow-[0_3px_8px_rgba(0,130,140,0.08)]"
                    : "border-[#dfeaea] bg-white hover:border-[#a9cece]"
                }`}
                key={goal.value}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  name="goal"
                  onChange={() => onChange("goal", goal.value)}
                  type="radio"
                  value={goal.value}
                />
                <span
                  className={`grid size-[42px] shrink-0 place-items-center rounded-[11px] ${
                    selected
                      ? "bg-[#008b98] text-white shadow-[0_4px_8px_rgba(0,128,139,0.18)]"
                      : "bg-[#e2f5f2] text-[#078b8d]"
                  }`}
                >
                  <GoalIcon isOjt={goal.value === "ojt-seeker"} />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block pr-5 text-[15px] font-semibold text-[#354346]">
                    {goal.title}
                  </span>
                  <span className="mt-2 block text-[12px] leading-[1.7] text-[#7b898b]">
                    {goal.description}
                  </span>
                </span>
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute top-5 right-5 grid size-[18px] place-items-center rounded-full bg-[#008b98] text-white"
                  >
                    <svg className="size-3" fill="none" viewBox="0 0 16 16">
                      <path
                        d="m3.5 8 3 3 6-6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
      {errors.goal && (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {errors.goal}
        </p>
      )}
      <p className="mt-7 text-center text-xs text-[#7b898b]">
        Hiring instead?{" "}
        <a
          className="ml-2 font-semibold text-[#078b8d] hover:text-[#066f72] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d]"
          href="/signup?role=employer"
        >
          Register as an employer
        </a>
      </p>
    </div>
  );
}