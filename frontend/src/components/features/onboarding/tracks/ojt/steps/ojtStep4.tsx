import { useState, type KeyboardEvent } from "react";
import type { OjtStepProps } from "./ojtStepTypes";
import {
  AddItemButton,
  OjtChoice,
  OjtField,
  ojtInputClassName,
} from "./ojtStepTypes";

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
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitSkill();
  }

  function commitSkill() {
    const next = skill.trim();
    if (
      next &&
      !answers.skills.some((item) => item.toLowerCase() === next.toLowerCase())
    ) {
      onToggleList("skills", next);
    }
    setSkill("");
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
        <div className="flex items-center gap-2">
          <input
            className={`${ojtInputClassName} min-w-0 flex-1`}
            id="ojt-skills"
            onChange={(event) => setSkill(event.target.value)}
            onKeyDown={addSkill}
            placeholder="Type a skill"
            value={skill}
          />
          <AddItemButton
            disabled={!skill.trim()}
            label="skill"
            onClick={commitSkill}
          />
        </div>
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