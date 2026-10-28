import { useState, type KeyboardEvent } from "react";
import type { OjtStepProps } from "./ojtStepTypes";
import { OjtChoice, OjtField, ojtInputClassName } from "./ojtStepTypes";

const fields = [
  "Technology",
  "Marketing",
  "Design",
  "Finance",
  "Human Resources",
  "Engineering",
  "Healthcare",
  "Education",
  "Other",
];

export default function OjtStep4({
  answers,
  errors,
  onToggleList,
}: OjtStepProps) {
  const [skill, setSkill] = useState("");

  function addSkill(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && skill.trim()) {
      event.preventDefault();
      if (!answers.skills.includes(skill.trim())) {
        onToggleList("skills", skill.trim());
      }
      setSkill("");
    }
  }

  return (
    <div className="space-y-6">
      <OjtField
        error={errors.trainingFields}
        label={`Training fields (choose up to 3) · ${answers.trainingFields.length}/3`}
      >
        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <OjtChoice
              active={answers.trainingFields.includes(field)}
              key={field}
              onClick={() => onToggleList("trainingFields", field)}
            >
              {field}
            </OjtChoice>
          ))}
        </div>
      </OjtField>

      <OjtField error={errors.skills} htmlFor="ojt-skills" label="Skills">
        <p className="mb-2 text-xs leading-5 text-[#718082]">
          Add skills one at a time by pressing Enter.
        </p>
        <input
          className={ojtInputClassName}
          id="ojt-skills"
          onChange={(event) => setSkill(event.target.value)}
          onKeyDown={addSkill}
          placeholder="e.g. Figma, Excel, social media"
          value={skill}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {answers.skills.map((item) => (
            <button
              aria-label={`Remove ${item}`}
              className="rounded-full bg-[#edf9f7] px-3 py-1.5 text-xs text-[#087f87]"
              key={item}
              onClick={() => onToggleList("skills", item)}
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