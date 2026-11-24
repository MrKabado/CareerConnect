import type { OjtStepProps } from "./ojtStepTypes";
import { OjtField, ojtInputClassName } from "./ojtStepTypes";

export default function OjtStep3({ answers, errors, onChange }: OjtStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <OjtField error={errors.school} htmlFor="ojt-school" label="School name *">
          <input
            aria-invalid={Boolean(errors.school)}
            className={ojtInputClassName}
            id="ojt-school"
            onChange={(event) => onChange("school", event.target.value)}
            placeholder="e.g. University of the Philippines"
            value={answers.school}
          />
        </OjtField>
        <OjtField error={errors.course} htmlFor="ojt-course" label="Course / program *">
          <input
            aria-invalid={Boolean(errors.course)}
            className={ojtInputClassName}
            id="ojt-course"
            onChange={(event) => onChange("course", event.target.value)}
            placeholder="e.g. BS Information Technology"
            value={answers.course}
          />
        </OjtField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OjtField error={errors.yearLevel} htmlFor="ojt-year-level" label="Year level *">
          <select
            aria-invalid={Boolean(errors.yearLevel)}
            className={ojtInputClassName}
            id="ojt-year-level"
            onChange={(event) => onChange("yearLevel", event.target.value)}
            value={answers.yearLevel}
          >
            <option value="">Select your year level</option>
            {["1st year", "2nd year", "3rd year", "4th year", "5th year"].map(
              (year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ),
            )}
          </select>
        </OjtField>
        <OjtField
          error={errors.requiredOjtHours}
          htmlFor="ojt-required-hours"
          label="Required OJT hours *"
        >
          <input
            aria-invalid={Boolean(errors.requiredOjtHours)}
            className={ojtInputClassName}
            id="ojt-required-hours"
            min="1"
            onChange={(event) =>
              onChange("requiredOjtHours", event.target.value)
            }
            placeholder="e.g. 486"
            type="number"
            value={answers.requiredOjtHours}
          />
        </OjtField>
      </div>

      <div className="flex items-start justify-between gap-5 rounded-xl border border-[#e7eeee] p-4">
        <div>
          <p className="text-sm font-semibold text-[#354346]">
            Does your school require an MOA?
          </p>
          <p className="mt-1 text-xs leading-5 text-[#718082]">
            We’ll prioritize employers with an active Memorandum of Agreement.
          </p>
        </div>
        <fieldset className="flex shrink-0 flex-wrap gap-3">
          <legend className="sr-only">Does your school require an MOA?</legend>
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
            { label: "Not provided", value: null },
          ].map((option) => (
            <label
              className="inline-flex items-center gap-1.5 text-xs text-[#526365]"
              key={option.label}
            >
              <input
                checked={answers.requiresMoa === option.value}
                className="size-4 accent-[#078b8d]"
                name="onboarding-requires-moa"
                onChange={() => onChange("requiresMoa", option.value)}
                type="radio"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}