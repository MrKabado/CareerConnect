import { useRef, useState, type FormEvent } from "react";
import type { OnboardingAnswers } from "@/features/onboarding/store";
import { ProfilePanel } from "@/components/common/user/profileComponents";
import { toNameCase } from "@/features/auth/nameFormatting";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

export type ProfilePreferencesDraft = Pick<
  OnboardingAnswers,
  | "school"
  | "course"
  | "yearLevel"
  | "requiredOjtHours"
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
> & {
  requiresMoa: boolean | null;
  educationStatus: "undergraduate" | "graduated" | "";
  graduationYear: string;
  otherCategories: string[];
  name: string;
  phone: string;
  city: string;
  portfolioLink: string;
  githubLink: string;
  linkedinLink: string;
  otherLinkLabel: string;
  otherLink: string;
};

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date" | "url" | "tel";
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[8px] font-semibold uppercase tracking-[0.04em] text-[#667779]">
        {label}
      </span>
      <input
        className="h-10 w-full rounded-lg border border-[#cbd8d7] bg-white px-3 text-[11px] text-[#263a3c] outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
        onChange={(event) => onChange(event.target.value)}
        max={max}
        min={min}
        placeholder={placeholder}
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
      <span className="mb-1.5 block text-[8px] font-semibold uppercase tracking-[0.04em] text-[#667779]">
        {label}
      </span>
      <select
        className="h-10 w-full rounded-lg border border-[#cbd8d7] bg-white px-3 text-[11px] text-[#263a3c] outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
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
  maxValues,
  suggestions = [],
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  maxValues?: number;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");

  function addValues(rawValues: string[]) {
    const existing = new Set(values.map((value) => value.toLocaleLowerCase()));
    const additions = rawValues
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => !existing.has(value.toLocaleLowerCase()))
      .slice(
        0,
        maxValues === undefined
          ? undefined
          : Math.max(0, maxValues - values.length),
      );
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
      <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-[#667779]">
        {label}
      </p>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-[#cbd8d7] bg-white px-2.5 py-2 focus-within:border-[#078b8d] focus-within:ring-3 focus-within:ring-[#078b8d]/10">
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
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[10px] text-[#263a3c] outline-none placeholder:text-[#667779]"
          list={suggestions.length > 0 ? `${label.replace(/\s+/g, "-")}-suggestions` : undefined}
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
        {suggestions.length > 0 && (
          <datalist id={`${label.replace(/\s+/g, "-")}-suggestions`}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        )}
        <button
          aria-label={`Add ${label.toLowerCase()}`}
          className="min-h-8 shrink-0 rounded-md bg-[#078b8d] px-3 text-[9px] font-semibold text-white transition hover:bg-[#06777a] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            !input.trim() ||
            (maxValues !== undefined && values.length >= maxValues)
          }
          onClick={commitInput}
          type="button"
        >
          Add
        </button>
      </div>
      {maxValues !== undefined && (
        <p className="mt-1 text-[9px] text-[#667779]">
          Up to {maxValues} items.
        </p>
      )}
    </div>
  );
}

function CategorySelectField({
  values,
  categories,
  categoriesLoading,
  categoriesError,
  onChange,
}: {
  values: string[];
  categories: Array<{ id: number; name: string }>;
  categoriesLoading: boolean;
  categoriesError: string | null;
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[8px] font-semibold uppercase tracking-[0.04em] text-[#667779]">
        Categories
      </label>
      <select
        aria-label="Select a category"
        className="h-10 w-full rounded-lg border border-[#cbd8d7] bg-white px-3 text-[11px] text-[#263a3c] outline-none focus:border-[#078b8d] focus:ring-3 focus:ring-[#078b8d]/10"
        disabled={categoriesLoading || categoriesError !== null || values.length >= 5}
        onChange={(event) => {
          const value = event.target.value;
          if (value && !values.includes(value) && values.length < 5) {
            onChange([...values, value]);
          }
          event.target.value = "";
        }}
        value=""
      >
        <option value="">
          {categoriesLoading ? "Loading categories…" : "Select a category"}
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </select>
      {categoriesError && (
        <p className="mt-1 text-[10px] text-[#8b332c]" role="alert">
          {categoriesError}
        </p>
      )}
      <p className="mt-1 text-[9px] leading-4 text-[#667779]">
        Choose up to five categories. Use “Other categories” below if yours
        isn’t listed.
      </p>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((category) => (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#e5f4f2] pl-2.5 pr-1 py-1 text-[9px] font-semibold text-[#356b68]"
              key={category}
            >
              {category}
              <button
                aria-label={`Remove ${category}`}
                className="grid size-4 place-items-center rounded-full text-[12px] leading-none hover:bg-white/70"
                onClick={() =>
                  onChange(values.filter((item) => item !== category))
                }
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePreferencesEditor({
  isOjtSeeker,
  isSaving,
  initialPreferences,
  categories,
  categoriesLoading,
  categoriesError,
  onClose,
  onSave,
  saveError,
}: {
  isOjtSeeker: boolean;
  isSaving: boolean;
  initialPreferences: ProfilePreferencesDraft;
  categories: Array<{ id: number; name: string }>;
  categoriesLoading: boolean;
  categoriesError: string | null;
  onClose: () => void;
  onSave: (preferences: ProfilePreferencesDraft) => Promise<void>;
  saveError: string | null;
}) {
  const [draft, setDraft] = useState(initialPreferences);
  const dialogRef = useRef<HTMLElement>(null);
  useDialogBehavior(dialogRef, true, onClose);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) await onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-4 max-[600px]:p-3">
      <button
        aria-label="Close profile preferences editor"
        className="absolute inset-0 size-full cursor-default bg-[#1f3333]/35"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="profile-preferences-title"
        aria-modal="true"
        className="relative z-10 flex h-[min(760px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] w-full max-w-[620px] flex-col overflow-hidden rounded-[16px] bg-[#f5f8f8] shadow-[0_16px_48px_rgba(27,54,52,0.2)] max-[600px]:h-[calc(100dvh-1.5rem)] max-[600px]:max-h-[calc(100dvh-1.5rem)]"
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
            <p className="mt-1 text-[10px] text-[#627273]">
              Changes update your profile and recommendations.
            </p>
          </div>
          </div>
          <button
            aria-label="Close profile preferences editor"
            disabled={isSaving}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[20px] leading-none text-[#526365] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form
          aria-busy={isSaving}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={submit}
        >
          <fieldset
            className="flex min-h-0 min-w-0 flex-1 flex-col border-0 p-0"
            disabled={isSaving}
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch] max-[600px]:px-3.5">
            {saveError && (
              <p
                className="rounded-lg border border-[#e5b7b2] bg-[#fff4f2] px-3 py-2 text-[11px] leading-5 text-[#8b332c]"
                role="alert"
              >
                {saveError}
              </p>
            )}
            <ProfilePanel icon="user" title="Personal information">
              <div className="grid grid-cols-2 gap-3 max-[460px]:grid-cols-1">
                <TextField
                  label="Full name"
                  onChange={(name) => setDraft((current) => ({ ...current, name: toNameCase(name) }))}
                  value={draft.name}
                />
                <TextField
                  label="Mobile number"
                  onChange={(phone) => setDraft((current) => ({ ...current, phone }))}
                  value={draft.phone}
                />
                <TextField
                  label="City"
                  onChange={(city) => setDraft((current) => ({ ...current, city }))}
                  value={draft.city}
                />
              </div>
            </ProfilePanel>
            <ProfilePanel icon="briefcase" title="Portfolio & professional links (optional)">
              <div className="grid grid-cols-2 gap-3 max-[460px]:grid-cols-1">
                <TextField
                  label="Portfolio or personal website"
                  onChange={(portfolioLink) => setDraft((current) => ({ ...current, portfolioLink }))}
                  placeholder="yourname.com or https://yourname.com"
                  value={draft.portfolioLink}
                />
                <TextField
                  label="GitHub"
                  onChange={(githubLink) => setDraft((current) => ({ ...current, githubLink }))}
                  placeholder="github.com/username"
                  value={draft.githubLink}
                />
                <TextField
                  label="LinkedIn"
                  onChange={(linkedinLink) => setDraft((current) => ({ ...current, linkedinLink }))}
                  placeholder="linkedin.com/in/username"
                  value={draft.linkedinLink}
                />
                <TextField
                  label="Other link label"
                  onChange={(otherLinkLabel) => setDraft((current) => ({ ...current, otherLinkLabel }))}
                  value={draft.otherLinkLabel}
                  placeholder="e.g. Behance or Medium"
                />
                <TextField
                  label="Other link URL"
                  onChange={(otherLink) => setDraft((current) => ({ ...current, otherLink }))}
                  value={draft.otherLink}
                  placeholder="yourname.com/page"
                />
              </div>
            </ProfilePanel>
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
                    <SelectField
                      label="Education status"
                      onChange={(educationStatus) =>
                        setDraft((current) => ({
                          ...current,
                          educationStatus: educationStatus as "undergraduate" | "graduated" | "",
                          yearLevel: "",
                          graduationYear: "",
                        }))
                      }
                      options={[
                        { label: "Select education status", value: "" },
                        { label: "Undergraduate", value: "undergraduate" },
                        { label: "Graduated", value: "graduated" },
                      ]}
                      value={draft.educationStatus}
                    />
                    {draft.educationStatus === "undergraduate" && (
                      <TextField
                        label="Year level"
                        onChange={(yearLevel) => setDraft((current) => ({ ...current, yearLevel }))}
                        max={6}
                        min={1}
                        type="number"
                        value={draft.yearLevel}
                      />
                    )}
                    {draft.educationStatus === "graduated" && (
                      <TextField
                        label="Graduation year"
                        onChange={(graduationYear) => setDraft((current) => ({ ...current, graduationYear }))}
                        max={new Date().getFullYear() + 10}
                        min={1900}
                        type="number"
                        value={draft.graduationYear}
                      />
                    )}
                    <TextField
                      label="Required OJT hours"
                      onChange={(requiredOjtHours) => setDraft((current) => ({ ...current, requiredOjtHours }))}
                      max={2000}
                      min={1}
                      type="number"
                      value={draft.requiredOjtHours}
                    />
                  </div>
                  <fieldset className="mt-3">
                    <legend className="text-[9px] font-semibold text-[#526365]">
                      Does your school require an MOA?
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {[
                        { label: "Yes", value: true },
                        { label: "No", value: false },
                        { label: "Not provided", value: null },
                      ].map((option) => (
                        <label
                          className="inline-flex items-center gap-1.5 text-[9px] text-[#526365]"
                          key={option.label}
                        >
                          <input
                            checked={draft.requiresMoa === option.value}
                            className="size-3.5 accent-[#078b8d]"
                            name="requires-moa"
                            onChange={() =>
                              setDraft((current) => ({
                                ...current,
                                requiresMoa: option.value,
                              }))
                            }
                            type="radio"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </ProfilePanel>
                <ProfilePanel icon="skills" title="Training & skills">
                  <div className="space-y-3">
                    <CategorySelectField
                      categories={categories}
                      categoriesError={categoriesError}
                      categoriesLoading={categoriesLoading}
                      onChange={(trainingFields) =>
                        setDraft((current) => ({ ...current, trainingFields }))
                      }
                      values={draft.trainingFields}
                    />
                    <ListField
                      label="Other categories — please specify"
                      maxValues={5}
                      onChange={(otherCategories) => setDraft((current) => ({ ...current, otherCategories }))}
                      placeholder="Type a category not in the list"
                      values={draft.otherCategories}
                    />
                    <ListField
                      label="Skills"
                      maxValues={30}
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
                      maxValues={10}
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
                        { label: "Select allowance preference", value: "" },
                        { label: "Paid only", value: "Paid only" },
                        { label: "Unpaid OK", value: "Unpaid OK" },
                        { label: "No preference", value: "No preference" },
                      ]}
                      value={draft.allowancePreference}
                    />
                  </div>
                </ProfilePanel>
              </>
            ) : (
              <>
                <ProfilePanel icon="education" title="Education">
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
                    <SelectField
                      label="Education status"
                      onChange={(educationStatus) =>
                        setDraft((current) => ({
                          ...current,
                          educationStatus: educationStatus as "undergraduate" | "graduated" | "",
                          yearLevel: "",
                          graduationYear: "",
                        }))
                      }
                      options={[
                        { label: "Select education status", value: "" },
                        { label: "Undergraduate", value: "undergraduate" },
                        { label: "Graduated", value: "graduated" },
                      ]}
                      value={draft.educationStatus}
                    />
                    {draft.educationStatus === "undergraduate" && (
                      <TextField
                        label="Year level"
                        onChange={(yearLevel) => setDraft((current) => ({ ...current, yearLevel }))}
                        max={6}
                        min={1}
                        type="number"
                        value={draft.yearLevel}
                      />
                    )}
                    {draft.educationStatus === "graduated" && (
                      <TextField
                        label="Graduation year"
                        onChange={(graduationYear) => setDraft((current) => ({ ...current, graduationYear }))}
                        max={new Date().getFullYear() + 10}
                        min={1900}
                        type="number"
                        value={draft.graduationYear}
                      />
                    )}
                  </div>
                </ProfilePanel>
                <ProfilePanel icon="settings" title="Work interests">
                  <div className="space-y-3">
                    <CategorySelectField
                      categories={categories}
                      categoriesError={categoriesError}
                      categoriesLoading={categoriesLoading}
                      onChange={(jobCategories) =>
                        setDraft((current) => ({ ...current, jobCategories }))
                      }
                      values={draft.jobCategories}
                    />
                    <ListField
                      label="Other categories — please specify"
                      maxValues={5}
                      onChange={(otherCategories) => setDraft((current) => ({ ...current, otherCategories }))}
                      placeholder="Type a category not in the list"
                      values={draft.otherCategories}
                    />
                    <ListField
                      label="Desired job titles"
                      maxValues={3}
                      onChange={(desiredJobTitles) => setDraft((current) => ({ ...current, desiredJobTitles }))}
                      placeholder="Add a desired role"
                      suggestions={["Software Developer", "Data Analyst", "Marketing Specialist", "Project Coordinator", "UX/UI Designer"]}
                      values={draft.desiredJobTitles}
                    />
                    <ListField
                      label="Skills"
                      maxValues={30}
                      onChange={(skills) => setDraft((current) => ({ ...current, skills }))}
                      placeholder="Add a skill"
                      suggestions={["Communication", "Teamwork", "Microsoft Excel", "Project Management", "JavaScript", "React", "Customer Service"]}
                      values={draft.skills}
                    />
                    <p className="text-[9px] leading-4 text-[#667779]">
                      Suggestions are examples only. Pick the closest match,
                      or enter your own title or skill.
                    </p>
                  </div>
                </ProfilePanel>
                <ProfilePanel icon="pin" title="Work preferences">
                  <div className="grid grid-cols-2 gap-3 max-[460px]:grid-cols-1">
                    <ListField
                      label="Preferred locations"
                      maxValues={10}
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
                        { label: "On-site", value: "Onsite" },
                      ]}
                      value={draft.workSetup}
                    />
                    <fieldset>
                      <legend className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-[#667779]">
                        Employment types
                      </legend>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {["Full-time", "Part-time", "Contract"].map((type) => (
                          <label
                            className="inline-flex items-center gap-1.5 text-[10px] text-[#526365]"
                            key={type}
                          >
                            <input
                              checked={draft.employmentTypes.includes(type)}
                              className="size-3.5 accent-[#078b8d]"
                              onChange={() =>
                                setDraft((current) => ({
                                  ...current,
                                  employmentTypes: current.employmentTypes.includes(type)
                                    ? current.employmentTypes.filter((item) => item !== type)
                                    : [...current.employmentTypes, type],
                                }))
                              }
                              type="checkbox"
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-[9px] leading-4 text-[#667779]">
                        Select all types you would consider.
                      </p>
                    </fieldset>
                  </div>
                </ProfilePanel>
                <ProfilePanel icon="briefcase" title="Compensation & experience">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Minimum salary"
                      onChange={(minimumSalary) => setDraft((current) => ({ ...current, minimumSalary }))}
                      min={0}
                      type="number"
                      value={draft.minimumSalary}
                    />
                    <TextField
                      label="Maximum salary"
                      onChange={(maximumSalary) => setDraft((current) => ({ ...current, maximumSalary }))}
                      min={0}
                      type="number"
                      value={draft.maximumSalary}
                    />
                    <SelectField
                      label="Experience level"
                      onChange={(experienceLevel) =>
                        setDraft((current) => ({ ...current, experienceLevel }))
                      }
                      options={[
                        { label: "Select experience level", value: "" },
                        { label: "Fresh graduate", value: "Fresh graduate" },
                        { label: "1–3 years", value: "1–3 years" },
                        { label: "3–5 years", value: "3–5 years" },
                        { label: "5+ years", value: "5+ years" },
                      ]}
                      value={draft.experienceLevel}
                    />
                  </div>
                </ProfilePanel>
              </>
            )}
            </div>

          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e4ecea] bg-white px-5 py-4 max-[480px]:px-3">
            {isSaving && (
              <p
                aria-live="polite"
                className="mr-auto flex items-center gap-2 text-[10px] font-medium text-[#526365]"
                role="status"
              >
                <svg
                  aria-hidden="true"
                  className="size-4 motion-safe:animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
                  />
                </svg>
                Saving your preferences…
              </p>
            )}
            <button
              className="min-h-9 rounded-lg border border-[#dfe9e8] px-4 text-[10px] font-semibold text-[#526365] hover:bg-[#f6faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              aria-busy={isSaving}
              className="min-h-9 rounded-lg bg-[#078b8d] px-4 text-[10px] font-semibold text-white hover:bg-[#06777a] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving…" : "Save preferences"}
            </button>
          </footer>
          </fieldset>
        </form>
      </section>
    </div>
  );
}