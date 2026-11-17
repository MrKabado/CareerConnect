import type { OnboardingStepId } from "@/features/onboarding/config/steps";
import type { OnboardingAnswers } from "@/features/onboarding/store";

type OjtStep7Props = {
  answers: OnboardingAnswers;
  onEdit: (step: OnboardingStepId) => void;
};

function display(value: string | string[] | File | null) {
  if (value instanceof File) return value.name;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not added";
  return value?.trim() || "Not added";
}

export default function OjtStep7({ answers, onEdit }: OjtStep7Props) {
  const sections: {
    title: string;
    step: OnboardingStepId;
    rows: [string, string | string[] | File | null][];
  }[] = [
    {
      title: "School details",
      step: "school",
      rows: [
        ["School", answers.school],
        ["Course / program", answers.course],
        ["Year level", answers.yearLevel],
        ["Required OJT hours", answers.requiredOjtHours],
        ["MOA required", answers.requiresMoa ? "Yes" : "No"],
      ],
    },
    {
      title: "Training interests",
      step: "interests",
      rows: [
        ["Fields", answers.trainingFields],
        ["Skills", answers.skills],
      ],
    },
    {
      title: "OJT preferences",
      step: "preferences",
      rows: [
        ["Start date", answers.preferredStartDate],
        ["Allowance", answers.allowancePreference],
        ["Work setup", answers.workSetup],
        ["Locations", answers.preferredLocations],
      ],
    },
    {
      title: "Resume",
      step: "resume",
      rows: [
        ["File", answers.resumeFile ?? (answers.resumeSkipped ? "Skipped" : null)],
      ],
    },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section
          className="rounded-xl border border-[#e5eeee] px-4 py-3"
          key={section.title}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#354346]">
              {section.title}
            </h2>
            <button
              className="text-xs font-semibold text-[#078b8d] hover:underline"
              onClick={() => onEdit(section.step)}
              type="button"
            >
              Edit
            </button>
          </div>
          <dl className="space-y-1.5">
            {section.rows.map(([label, value]) => (
              <div
                className="grid grid-cols-[minmax(100px,0.7fr)_1fr] gap-3 text-xs"
                key={label}
              >
                <dt className="text-[#829092]">{label}</dt>
                <dd className="break-words text-[#526365]">
                  {display(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}