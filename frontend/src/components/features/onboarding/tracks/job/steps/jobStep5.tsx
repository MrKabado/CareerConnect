import { useState, type KeyboardEvent } from "react";
import type { OjtStepProps } from "@/components/features/onboarding/tracks/ojt/steps/ojtStepTypes";
import {
  OjtChoice,
  OjtField,
  ojtInputClassName,
} from "@/components/features/onboarding/tracks/ojt/steps/ojtStepTypes";

const employmentTypes = ["Full-time", "Part-time", "Contract"];
const workSetups = ["Onsite", "Hybrid", "Remote"];

export default function JobStep5({
  answers,
  errors,
  onChange,
  onToggleList,
}: OjtStepProps) {
  const [location, setLocation] = useState("");

  function addLocation(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = location.trim();
    if (value && !answers.preferredLocations.includes(value)) {
      onToggleList("preferredLocations", value);
    }
    setLocation("");
  }

  return (
    <div className="space-y-5">
      <OjtField
        error={errors.employmentTypes}
        label={
          <>
            Employment type <span className="text-[#d34c4c]">*</span>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {employmentTypes.map((type) => (
            <OjtChoice
              active={answers.employmentTypes.includes(type)}
              key={type}
              onClick={() => onToggleList("employmentTypes", type)}
            >
              {type}
            </OjtChoice>
          ))}
        </div>
      </OjtField>

      <OjtField
        error={errors.workSetup}
        label={
          <>
            Work setup <span className="text-[#d34c4c]">*</span>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {workSetups.map((setup) => (
            <OjtChoice
              active={answers.workSetup === setup}
              key={setup}
              onClick={() => onChange("workSetup", setup)}
            >
              {setup}
            </OjtChoice>
          ))}
        </div>
      </OjtField>

      <OjtField
        error={errors.preferredLocations}
        htmlFor="job-locations"
        label={
          <>
            Preferred locations <span className="text-[#d34c4c]">*</span>
          </>
        }
      >
        <input
          aria-label="Preferred locations"
          className={ojtInputClassName}
          id="job-locations"
          onChange={(event) => setLocation(event.target.value)}
          onKeyDown={addLocation}
          placeholder="Type a city and press Enter"
          value={location}
        />
        {answers.preferredLocations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {answers.preferredLocations.map((item) => (
              <button
                aria-label={`Remove ${item}`}
                className="rounded-full bg-[#edf9f7] px-3 py-1.5 text-xs text-[#087f87]"
                key={item}
                onClick={() => onToggleList("preferredLocations", item)}
                type="button"
              >
                {item} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}
      </OjtField>

      <div className="grid gap-3 sm:grid-cols-2">
        <OjtField
          error={errors.minimumSalary}
          htmlFor="minimum-salary"
          label={
            <span className="flex items-center justify-between">
              Minimum salary <span className="font-normal text-[#9ba6a7]">Optional</span>
            </span>
          }
        >
          <input
            className={ojtInputClassName}
            id="minimum-salary"
            min="0"
            onChange={(event) => onChange("minimumSalary", event.target.value)}
            placeholder="₱ Min monthly"
            type="number"
            value={answers.minimumSalary}
          />
        </OjtField>
        <OjtField
          error={errors.maximumSalary}
          htmlFor="maximum-salary"
          label={
            <span className="flex items-center justify-between">
              Maximum salary <span className="font-normal text-[#9ba6a7]">Optional</span>
            </span>
          }
        >
          <input
            className={ojtInputClassName}
            id="maximum-salary"
            min="0"
            onChange={(event) => onChange("maximumSalary", event.target.value)}
            placeholder="₱ Max monthly"
            type="number"
            value={answers.maximumSalary}
          />
        </OjtField>
      </div>
    </div>
  );
}