import { useState, type KeyboardEvent } from "react";
import type { OjtStepProps } from "./ojtStepTypes";
import {
  OjtChoice,
  OjtField,
  ojtInputClassName,
} from "./ojtStepTypes";

const allowanceOptions = ["Required", "Preferred", "Not required"];
const workSetups = ["Onsite", "Hybrid", "Remote"];

export default function OjtStep5({
  answers,
  errors,
  onChange,
  onToggleList,
}: OjtStepProps) {
  const [location, setLocation] = useState("");

  function addLocation(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && location.trim()) {
      event.preventDefault();
      const next = location.trim();
      if (!answers.preferredLocations.includes(next)) {
        onToggleList("preferredLocations", next);
      }
      setLocation("");
    }
  }

  return (
    <div className="space-y-5">
      <OjtField
        error={errors.preferredStartDate}
        htmlFor="ojt-start-date"
        label="Preferred start date *"
      >
        <input
          aria-invalid={Boolean(errors.preferredStartDate)}
          className={ojtInputClassName}
          id="ojt-start-date"
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) =>
            onChange("preferredStartDate", event.target.value)
          }
          type="date"
          value={answers.preferredStartDate}
        />
      </OjtField>

      <OjtField
        error={errors.allowancePreference}
        label="Allowance preference *"
      >
        <div className="flex flex-wrap gap-2">
          {allowanceOptions.map((option) => (
            <OjtChoice
              active={answers.allowancePreference === option}
              key={option}
              onClick={() => onChange("allowancePreference", option)}
            >
              {option}
            </OjtChoice>
          ))}
        </div>
      </OjtField>

      <OjtField error={errors.workSetup} label="Preferred work setup *">
        <div className="grid gap-3 sm:grid-cols-3">
          {workSetups.map((setup) => (
            <button
              aria-pressed={answers.workSetup === setup}
              className={`rounded-xl border p-3 text-left transition ${
                answers.workSetup === setup
                  ? "border-[#078b8d] bg-[#edf9f7]"
                  : "border-[#dfe8e8] hover:border-[#b8cece]"
              }`}
              key={setup}
              onClick={() => onChange("workSetup", setup)}
              type="button"
            >
              <span className="block text-sm font-semibold text-[#354346]">
                {setup}
              </span>
            </button>
          ))}
        </div>
      </OjtField>

      <OjtField
        error={errors.preferredLocations}
        label="Preferred locations *"
      >
        <p className="mb-2 text-xs text-[#718082]">
          Enter a city or area, then press Enter.
        </p>
        <input
          className={ojtInputClassName}
          aria-label="Preferred locations"
          onChange={(event) => setLocation(event.target.value)}
          onKeyDown={addLocation}
          placeholder="e.g. Quezon City"
          value={location}
        />
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
      </OjtField>
    </div>
  );
}