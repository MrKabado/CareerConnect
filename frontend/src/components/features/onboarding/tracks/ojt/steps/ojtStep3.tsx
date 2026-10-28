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
        <button
          aria-checked={answers.requiresMoa}
          aria-label="School requires an MOA"
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
            answers.requiresMoa ? "bg-[#078b8d]" : "bg-[#cbd6d6]"
          }`}
          onClick={() => onChange("requiresMoa", !answers.requiresMoa)}
          role="switch"
          type="button"
        >
          <span
            className={`absolute top-1 size-4 rounded-full bg-white transition ${
              answers.requiresMoa ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}