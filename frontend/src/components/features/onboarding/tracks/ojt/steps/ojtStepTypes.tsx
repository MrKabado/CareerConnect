import type { ReactNode } from "react";
import type { OnboardingErrors } from "@/features/onboarding/schemas";
import type { OnboardingAnswers } from "@/features/onboarding/store";

export type OjtStepProps = {
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  isSubmitting?: boolean;
  isResumeUploaded?: boolean;
  isResumeAlreadyUploaded?: boolean;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
  onToggleList: (
    field:
      | "trainingFields"
      | "jobCategories"
      | "desiredJobTitles"
      | "employmentTypes"
      | "skills"
      | "preferredLocations",
    value: string,
  ) => void;
};

export const ojtInputClassName =
  "h-11 w-full rounded-[9px] border border-[#dfe8e8] bg-white px-3 text-sm text-[#354346] outline-none transition placeholder:text-[#a0acad] hover:border-[#c5d6d6] focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10";

export function AddItemButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`Add ${label}`}
      className="h-11 shrink-0 rounded-[9px] border border-[#008b98] bg-[#008b98] px-4 text-sm font-semibold text-white transition hover:border-[#007985] hover:bg-[#007985] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      Add
    </button>
  );
}

export function OjtField({
  label,
  error,
  htmlFor,
  children,
}: {
  label: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {htmlFor ? (
        <label
          className="mb-1.5 block text-xs font-semibold text-[#354346]"
          htmlFor={htmlFor}
        >
          {label}
        </label>
      ) : (
        <span className="mb-1.5 block text-xs font-semibold text-[#354346]">
          {label}
        </span>
      )}
      {children}
      {error && (
        <p className="mt-1 text-[11px] text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function OjtChoice({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
        active
          ? "border-[#078b8d] bg-[#edf9f7] text-[#087f87]"
          : "border-[#dfe8e8] bg-white text-[#526365] hover:border-[#b8cece]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
