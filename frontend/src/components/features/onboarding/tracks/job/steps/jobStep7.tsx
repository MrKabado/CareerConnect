import type { OnboardingStepId } from "@/features/onboarding/config/steps";
import type { OnboardingAnswers } from "@/features/onboarding/store";

type JobStep7Props = {
  answers: OnboardingAnswers;
  onEdit: (step: OnboardingStepId) => void;
};

function display(value: string | string[] | File | null) {
  if (value instanceof File) return value.name;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not added";
  return value?.trim() || "Not added";
}

export default function JobStep7({ answers, onEdit }: JobStep7Props) {
  const sections: {
    title: string;
    step: OnboardingStepId;
    rows: [string, string | string[] | File | null][];
  }[] = [
    {
      title: "Your goal",
      step: "goal",
      rows: [["Looking for", "Job opportunities"]],
    },
    {
      title: "Account",
      step: "create-account",
      rows: [
        ["Full name", answers.name],
        ["Email", answers.email],
      ],
    },
    {
      title: "Interests",
      step: "job-interests",
      rows: [["Categories", answers.jobCategories]],
    },
    {
      title: "Target roles & skills",
      step: "job-skills",
      rows: [
        ["Desired roles", answers.desiredJobTitles],
        ["Skills", answers.skills],
        ["Experience", answers.experienceLevel],
      ],
    },
    {
      title: "Work preferences",
      step: "job-preferences",
      rows: [
        ["Employment type", answers.employmentTypes],
        ["Work setup", answers.workSetup],
        ["Locations", answers.preferredLocations],
        [
          "Expected salary",
          answers.minimumSalary || answers.maximumSalary
            ? `₱${answers.minimumSalary || "Any"} – ₱${answers.maximumSalary || "Any"}`
            : null,
        ],
      ],
    },
    {
      title: "Resume",
      step: "resume",
      rows: [
        ["File", answers.resumeFile ?? (answers.resumeSkipped ? "Skipped for now" : null)],
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
                <dd className="wrap-break-word text-[#526365]">
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