import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OnboardingAnswers } from "@/features/onboarding/store";
import { ProfilePanel } from "@/components/common/user/profileComponents";

export type ProfilePreferencesDraft = Pick<
  OnboardingAnswers,
  | "school"
  | "course"
  | "yearLevel"
  | "requiredOjtHours"
  | "requiresMoa"
  | "trainingFields"
  | "jobCategories"
  | "desiredJobTitles"
  | "employmentTypes"
  | "experienceLevel"
  | "minimumSalary"
  | "maximumSalary"
  | "skills"
  | "preferredStartDate"
  | "allowancePreference"
  | "workSetup"
  | "preferredLocations"
>;

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[8px] font-semibold uppercase tracking-[0.04em] text-[#98a5a5]">
        {label}
      </span>
      <input
        className="h-10 w-full rounded-lg border border-[#dfe9e8] bg-white px-3 text-[11px] text-[#354749] outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[8px] font-semibold uppercase tracking-[0.04em] text-[#98a5a5]">
        {label}
      </span>
      <select
        className="h-10 w-full rounded-lg border border-[#dfe9e8] bg-white px-3 text-[11px] text-[#354749] outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addValues(rawValues: string[]) {
    const existing = new Set(values.map((value) => value.toLocaleLowerCase()));
    const additions = rawValues
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => !existing.has(value.toLocaleLowerCase()));
    if (additions.length > 0) onChange([...values, ...additions]);
  }

  function handleChange(value: string) {
    const segments = value.split(",");
    if (segments.length === 1) {
      setInput(value);
      return;
    }

    addValues(segments.slice(0, -1));
    setInput(segments.at(-1) ?? "");
  }

  function commitInput() {
    addValues([input]);
    setInput("");
  }

  return (
    <div>
      <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-[#98a5a5]">
        {label}
      </p>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-[#dfe9e8] bg-white px-2.5 py-2 focus-within:border-[#078b8d] focus-within:ring-3 focus-within:ring-[#078b8d]/10">
        {values.map((value) => (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[#e5f4f2] pl-2.5 pr-1 py-1 text-[9px] font-semibold text-[#417976]"
            key={value}
          >
            {value}
            <button
              aria-label={`Remove ${value}`}
              className="grid size-4 place-items-center rounded-full text-[12px] leading-none hover:bg-white/70 focus-visible:outline-[2px] focus-visible:outline-[#67c9c1]"
              onClick={() =>
                onChange(values.filter((current) => current !== value))
              }
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        <input
          aria-label={label}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[10px] text-[#354749] outline-none placeholder:text-[#9aa7a7]"
          onBlur={commitInput}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitInput();
            }
            if (event.key === "Backspace" && !input && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          placeholder={values.length === 0 ? placeholder : "Add another..."}
          value={input}
        />
      </div>
      <p className="mt-1 text-[8px] text-[#9aa7a7]">
        Press Enter or comma to add each item.
      </p>
    </div>
  );
}

export default function ProfilePreferencesEditor({
  isOjtSeeker,
  initialPreferences,
  onClose,
  onSave,
}: {
  isOjtSeeker: boolean;
  initialPreferences: ProfilePreferencesDraft;
  onClose: () => void;
  onSave: (preferences: ProfilePreferencesDraft) => void;
}) {
  const [draft, setDraft] = useState(initialPreferences);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const firstField = dialogRef.current?.querySelector<HTMLElement>(
      "input:not([type='checkbox']), select, button",
    );
    firstField?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close profile preferences editor"
        className="absolute inset-0 size-full cursor-default bg-[#1f3333]/35"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="profile-preferences-title"
        aria-modal="true"
        className="relative z-10 flex h-[calc(100dvh-2rem)] max-h-[760px] w-full max-w-[620px] flex-col overflow-hidden rounded-[16px] bg-[#f5f8f8] shadow-[0_16px_48px_rgba(27,54,52,0.2)]"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
            return;
          }
          if (event.key !== "Tab") return;

          const focusable = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not([disabled]), input:not([disabled]), select:not([disabled])",
            ),
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!first || !last) return;

          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e4ecea] bg-white px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e5f4f2] text-[#078b8d]">
              <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.8Z" />
              </svg>
            </span>
            <div>
            <h2
              className="text-[16px] font-bold text-[#293d3e]"
              id="profile-preferences-title"
            >
              Edit {isOjtSeeker ? "OJT" : "job-search"} preferences
            </h2>
            <p className="mt-1 text-[10px] text-[#829092]">
              Changes update your profile and recommendations.
            </p>
          </div>
          </div>
          <button
            aria-label="Close profile preferences editor"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[20px] leading-none text-[#718184] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 max-[600px]:px-3.5">
            {isOjtSeeker ? (
              <>
                <ProfilePanel icon="education" title="School & OJT requirements">
                  <div className="grid grid-cols-2 gap-3 max-[460px]:grid-cols-1">
                    <TextField
                      label="School"
                      onChange={(school) => setDraft((current) => ({ ...current, school }))}
                      value={draft.school}
                    />
                    <TextField
                      label="Course"
                      onChange={(course) => setDraft((current) => ({ ...current, course }))}
                      value={draft.course}
                    />
                    <TextField
                      label="Year level"
                      onChange={(yearLevel) => setDraft((current) => ({ ...current, yearLevel }))}
                      value={draft.yearLevel}
                    />
                    <TextField
                      label="Required OJT hours"
                      onChange={(requiredOjtHours) => setDraft((current) => ({ ...current, requiredOjtHours }))}
                      type="number"
                      value={draft.requiredOjtHours}
                    />
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-[9px] text-[#526365]">
                    <input
                      checked={draft.requiresMoa}
                      className="size-3.5 accent-[#078b8d]"
                      onChange={(event) => setDraft((current) => ({ ...current, requiresMoa: event.target.checked }))}
                      type="checkbox"
                    />
                    My school requires a MOA
                  </label>
                </ProfilePanel>
                <ProfilePanel icon="skills" title="Training & skills">
                  <div className="space-y-3">
                    <ListField
                      label="Training fields"
                      onChange={(trainingFields) => setDraft((current) => ({ ...current, trainingFields }))}
                      placeholder="Add a training field"
                      values={draft.trainingFields}
                    />
                    <ListField
                      label="Skills"
                      onChange={(skills) => setDraft((current) => ({ ...current, skills }))}
                      placeholder="Add a skill"
                      values={draft.skills}
                    />
                  </div>
                </ProfilePanel>
                <ProfilePanel icon="settings" title="Work preferences">
                  <div className="space-y-3">
                    <ListField
                      label="Preferred locations"
                      onChange={(preferredLocations) => setDraft((current) => ({ ...current, preferredLocations }))}
                      placeholder="Add a city or region"
                      values={draft.preferredLocations}
                    />
                    <div className="grid grid-cols-2 gap-3 max-[460px]:grid-cols-1">
                      <SelectField
                        label="Work setup"
                        onChange={(workSetup) => setDraft((current) => ({ ...current, workSetup }))}
                        options={[
                          { label: "Select work setup", value: "" },
                          { label: "On-site", value: "Onsite" },
                          { label: "Hybrid", value: "Hybrid" },
                          { label: "Remote", value: "Remote" },
                        ]}
                        value={draft.workSetup}
                      />
                      <TextField
                        label="Preferred start date"
                        onChange={(preferredStartDate) => setDraft((current) => ({ ...current, preferredStartDate }))}
                        type="date"
                        value={draft.preferredStartDate}
                      />
                    </div>
                    <SelectField
                      label="Allowance preference"
                      onChange={(allowancePreference) => setDraft((current) => ({ ...current, allowancePreference }))}
                      options={[
                        { label: "No preference", value: "" },
                        { label: "Paid only", value: "Paid only" },
                        { label: "With allowance", value: "With allowance" },
                        { label: "Any allowance", value: "Any allowance" },
                      ]}
                      value={draft.allowancePreference}
                    />
                  </div>
                </ProfilePanel>
              </>
            ) : (
              <>
                <ProfilePanel icon="settings" title="Work interests">
                  <div className="space-y-3">
                    <ListField
                      label="Job categories"
                      onChange={(jobCategories) => setDraft((current) => ({ ...current, jobCategories }))}
                      placeholder="Add a job category"
                      values={draft.jobCategories}
                    />
                    <ListField
                      label="Desired job titles"
                      onChange={(desiredJobTitles) => setDraft((current) => ({ ...current, desiredJobTitles }))}
                      placeholder="Add a desired role"
                      values={draft.desiredJobTitles}
                    />
                    <ListField
                      label="Skills"
                      onChange={(skills) => setDraft((current) => ({ ...current, skills }))}
                      placeholder="Add a skill"
                      values={draft.skills}
                    />
                  </div>
                </ProfilePanel>
                <ProfilePanel icon="pin" title="Work preferences">
                  <div className="grid grid-cols-2 gap-3 max-[460px]:grid-cols-1">
                    <ListField
                      label="Preferred locations"
                      onChange={(preferredLocations) => setDraft((current) => ({ ...current, preferredLocations }))}
                      placeholder="Add a city or region"
                      values={draft.preferredLocations}
                    />
                    <SelectField
                      label="Work setup"
                      onChange={(workSetup) => setDraft((current) => ({ ...current, workSetup }))}
                      options={[
                        { label: "Select work setup", value: "" },
                        { label: "Remote", value: "Remote" },
                        { label: "Hybrid", value: "Hybrid" },
                        { label: "On-site", value: "On-site" },
                      ]}
                      value={draft.workSetup}
                    />
                    <ListField
                      label="Employment types"
                      onChange={(employmentTypes) => setDraft((current) => ({ ...current, employmentTypes }))}
                      placeholder="Add an employment type"
                      values={draft.employmentTypes}
                    />
                  </div>
                </ProfilePanel>
                <ProfilePanel icon="briefcase" title="Compensation & experience">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Minimum salary"
                      onChange={(minimumSalary) => setDraft((current) => ({ ...current, minimumSalary }))}
                      type="number"
                      value={draft.minimumSalary}
                    />
                    <TextField
                      label="Maximum salary"
                      onChange={(maximumSalary) => setDraft((current) => ({ ...current, maximumSalary }))}
                      type="number"
                      value={draft.maximumSalary}
                    />
                    <TextField
                      label="Experience level"
                      onChange={(experienceLevel) => setDraft((current) => ({ ...current, experienceLevel }))}
                      value={draft.experienceLevel}
                    />
                  </div>
                </ProfilePanel>
              </>
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-[#e4ecea] bg-white px-5 py-4">
            <button
              className="min-h-9 rounded-lg border border-[#dfe9e8] px-4 text-[10px] font-semibold text-[#526365] hover:bg-[#f6faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-9 rounded-lg bg-[#078b8d] px-4 text-[10px] font-semibold text-white hover:bg-[#06777a] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
              type="submit"
            >
              Save preferences
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}