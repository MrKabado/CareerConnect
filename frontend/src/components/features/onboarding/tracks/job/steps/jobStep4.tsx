import { useState, type KeyboardEvent } from "react";
import type { OjtStepProps } from "@/components/features/onboarding/tracks/ojt/steps/ojtStepTypes";
import { toNameCase } from "@/features/auth/nameFormatting";
import {
  AddItemButton,
  OjtChoice,
  OjtField,
  ojtInputClassName,
} from "@/components/features/onboarding/tracks/ojt/steps/ojtStepTypes";

const experienceLevels = [
  "Fresh graduate",
  "1–3 years",
  "3–5 years",
  "5+ years",
];

function addToken(
  event: KeyboardEvent<HTMLInputElement>,
  value: string,
  field: "desiredJobTitles" | "skills",
  onToggleList: OjtStepProps["onToggleList"],
  clear: () => void,
  currentItems: string[],
  limit?: number,
) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  commitToken(value, field, onToggleList, clear, currentItems, limit);
}

function commitToken(
  value: string,
  field: "desiredJobTitles" | "skills",
  onToggleList: OjtStepProps["onToggleList"],
  clear: () => void,
  currentItems: string[],
  limit?: number,
) {
  const token = field === "desiredJobTitles" ? toNameCase(value.trim()) : value.trim();
  if (
    !token ||
    currentItems.some((item) => item.toLowerCase() === token.toLowerCase())
  ) {
    clear();
    return;
  }
  if (limit && currentItems.length >= limit) return;
  onToggleList(field, token);
  clear();
}

function TokenField({
  field,
  label,
  placeholder,
  values,
  error,
  limit,
  onToggleList,
}: {
  field: "desiredJobTitles" | "skills";
  label: string;
  placeholder: string;
  values: string[];
  error?: string;
  limit?: number;
  onToggleList: OjtStepProps["onToggleList"];
}) {
  const [value, setValue] = useState("");
  const token = value.trim();
  const isDuplicate = values.some(
    (item) => item.toLowerCase() === token.toLowerCase(),
  );
  const isAtLimit = limit !== undefined && values.length >= limit;

  return (
    <OjtField
      error={error}
      htmlFor={`job-${field}`}
      label={
        <span className="flex items-center justify-between gap-3">
          <span>
            {label} <span className="text-[#d34c4c]">*</span>
          </span>
          {limit && (
            <span className="font-normal text-[#9ba6a7]">
              {values.length}/{limit}
            </span>
          )}
        </span>
      }
    >
      <div className="flex items-center gap-2">
        <input
          className={`${ojtInputClassName} min-w-0 flex-1`}
          id={`job-${field}`}
          onChange={(event) => setValue(
            field === "desiredJobTitles" ? toNameCase(event.target.value) : event.target.value,
          )}
          onKeyDown={(event) =>
            addToken(
              event,
              value,
              field,
              onToggleList,
              () => setValue(""),
              values,
              limit,
            )
          }
          placeholder={placeholder}
          value={value}
        />
        <AddItemButton
          disabled={!token || (isAtLimit && !isDuplicate)}
          label={field === "desiredJobTitles" ? "job title" : "skill"}
          onClick={() =>
            commitToken(
              value,
              field,
              onToggleList,
              () => setValue(""),
              values,
              limit,
            )
          }
        />
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((item) => (
            <button
              aria-label={`Remove ${item}`}
              className="rounded-full bg-[#edf9f7] px-3 py-1.5 text-xs text-[#087f87]"
              key={item}
              onClick={() => onToggleList(field, item)}
              type="button"
            >
              {item} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </OjtField>
  );
}

export default function JobStep4({
  answers,
  errors,
  onToggleList,
  onChange,
}: OjtStepProps) {
  return (
    <div className="space-y-5">
      <TokenField
        error={errors.desiredJobTitles}
        field="desiredJobTitles"
        label="Desired job titles"
        limit={3}
        onToggleList={onToggleList}
        placeholder="Type a job title"
        values={answers.desiredJobTitles}
      />
      <TokenField
        error={errors.skills}
        field="skills"
        label="Skills"
        onToggleList={onToggleList}
        placeholder="Type a skill"
        values={answers.skills}
      />
      <OjtField error={errors.experienceLevel} label="Experience level (optional)">
        <div className="flex flex-wrap gap-2">
          {experienceLevels.map((level) => (
            <OjtChoice
              active={answers.experienceLevel === level}
              key={level}
              onClick={() => onChange("experienceLevel", level)}
            >
              {level}
            </OjtChoice>
          ))}
        </div>
      </OjtField>
    </div>
  );
}