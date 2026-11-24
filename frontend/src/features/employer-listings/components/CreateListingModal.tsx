import { useId, useRef, useState } from "react";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";
import { toNameCase } from "@/features/auth/nameFormatting";
import LocationSelector from "@/features/locations/LocationSelector";
import type { PhilippineAddress } from "@/features/locations/types";

type CreateListingModalProps = {
  companyName: string;
  isOpen: boolean;
  newListingType: "job" | "ojt" | null;
  newListingStep: 1 | 2;
  modalTitle: string;
  newListingForm: {
    title: string;
    categoryId: string;
    customCategoryName: string;
    location: string;
    locationAddress: PhilippineAddress;
    workSetup: string;
    availableSlots: string;
    requiredHours: string;
    summary: string;
    responsibilities: string;
    requirements: string[];
    requiredSkills: string[];
    employmentType: string;
    experienceRequirement: "with_experience" | "without_experience";
    minimumExperienceYears: string;
    salaryMin: string;
    salaryMax: string;
    allowanceType: string;
    allowanceAmount: string;
    acceptedCourses: string;
    moaAccepted: string;
    applicantLimit: string;
    expiresAt: string;
  };
  salaryRangeError: string | null;
  categories: Array<{ id: number; name: string }>;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onTypePick: (type: "job" | "ojt") => void;
  onBack: () => void;
  onFieldChange: (
    field: Exclude<keyof CreateListingModalProps["newListingForm"], "requirements" | "requiredSkills" | "locationAddress">,
    value: string,
  ) => void;
  onLocationChange: (address: PhilippineAddress) => void;
  onListChange: (field: "requirements" | "requiredSkills", values: string[]) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

function EditableListField({
  label,
  values,
  onChange,
  placeholder,
  titleCase = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  titleCase?: boolean;
}) {
  const [input, setInput] = useState("");

  function addItem() {
    const value = input.trim();
    if (!value || values.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setInput("");
      return;
    }
    onChange([...values, titleCase ? toNameCase(value) : value.replace(/^(\s*)(\p{L})/u, (_match, whitespace: string, letter: string) =>
      `${whitespace}${letter.toLocaleUpperCase()}`,
    )]);
    setInput("");
  }

  return (
    <div className="mt-4 text-[11px] font-medium text-[#445a5d]">
      <span className="mb-1.5 block">{label}</span>
      <div className="flex items-center gap-2">
        <input
          aria-label={label}
          maxLength={1000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          value={input}
          className="min-w-0 flex-1 rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d]"
        />
        <button
          className="rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!input.trim()}
          onClick={addItem}
          type="button"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {values.map((value, index) => (
            <li className="flex items-start justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[11px]" key={`${value}-${index}`}>
              <span>{value}</span>
              <button
                aria-label={`Remove ${value}`}
                className="shrink-0 text-[#9a4a45] hover:underline"
                onClick={() => onChange(values.filter((_item, itemIndex) => itemIndex !== index))}
                type="button"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CreateListingModal({
  companyName,
  isOpen,
  newListingType,
  newListingStep,
  modalTitle,
  newListingForm,
  salaryRangeError,
  categories,
  isSaving,
  error,
  onClose,
  onTypePick,
  onBack,
  onFieldChange,
  onLocationChange,
  onListChange,
  onSaveDraft,
  onPublish,
}: CreateListingModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehavior(dialogRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-[#3c4f53]/40 p-4 backdrop-blur-[1px] max-[600px]:p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-[680px] flex-col overflow-hidden rounded-[18px] border border-[#dfeae8] bg-[#f4f8f8] shadow-[0_30px_80px_rgba(24,48,51,0.22)] max-[600px]:max-h-[calc(100dvh-1.5rem)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#edf2f0] bg-[#f7fbfa] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#dff4ef] text-[11px] font-bold text-[#0d8fa2]">
              {newListingType ? "2" : "1"}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#688082]">
              {newListingType ? `Step ${newListingStep} of 2` : "New listing"}
            </span>
          </div>
          <button type="button" data-dialog-initial onClick={onClose} className="text-[11px] font-medium text-[#5c7174] transition hover:text-[#1e3437]">
            Close
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 text-[#1d3133] [-webkit-overflow-scrolling:touch]">
          {newListingStep === 1 ? (
            <>
              <div className="mb-4">
                <h2 id={titleId} className="text-[15px] font-bold tracking-[-0.04em] text-[#1d3133]">What are you hiring for?</h2>
                <p className="mt-1 text-[11px] text-[#667a7d]">Start with {companyName}&apos;s saved employer setup.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button type="button" onClick={() => onTypePick("job")} className={`rounded-[14px] border p-4 text-left transition ${newListingType === "job" ? "border-[#bfe5e7] bg-[#edf9fb] shadow-[0_12px_20px_rgba(14,142,155,0.08)]" : "border-[#e1eaeb] bg-white hover:border-[#d1e7ea]"}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dff4f3] text-[#0f8e9b]">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 7h10v10H7z" />
                        <path d="M9 11h6M9 15h4" />
                      </svg>
                    </span>
                    {newListingType === "job" && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0e8e9b] text-[10px] font-bold text-white">✓</span>}
                  </div>
                  <div className="text-[14px] font-semibold text-[#1d3133]">Full-time job</div>
                  <p className="mt-1 text-[11px] leading-5 text-[#607476]">Use your company&apos;s workplace and screening defaults.</p>
                  <div className="mt-3 text-[10px] font-semibold text-[#0d8fa2]">Create a job →</div>
                </button>

                <button type="button" onClick={() => onTypePick("ojt")} className={`rounded-[14px] border p-4 text-left transition ${newListingType === "ojt" ? "border-[#bfe5e7] bg-[#edf9fb] shadow-[0_12px_20px_rgba(14,142,155,0.08)]" : "border-[#e1eaeb] bg-white hover:border-[#d1e7ea]"}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff2d8] text-[#ae7d1a]">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2 4 7v6c0 4.3 2.8 8.1 8 9 5.2-.9 8-4.7 8-9V7l-8-5Z" />
                        <path d="M9.5 12.5 11 14l3.5-4" />
                      </svg>
                    </span>
                    {newListingType === "ojt" && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0e8e9b] text-[10px] font-bold text-white">✓</span>}
                  </div>
                  <div className="text-[14px] font-semibold text-[#1d3133]">OJT opportunity</div>
                  <p className="mt-1 text-[11px] leading-5 text-[#607476]">Include MDA support, required hours, and school programs.</p>
                  <div className="mt-3 text-[10px] font-semibold text-[#0d8fa2]">Create an OJT listing →</div>
                </button>
              </div>

              <div className="mt-4 rounded-[12px] border border-[#dfeae8] bg-[#eef7f6] p-3 text-[10px] leading-5 text-[#476368]">
                <span className="mr-2 text-[#0d8fa2]">•</span>
                Your job posting workflow uses your company default setup. You can review everything before publishing.
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <h2 id={titleId} className="text-[15px] font-bold tracking-[-0.04em] text-[#1d3133]">{modalTitle}</h2>
                <p className="mt-1 text-[11px] text-[#677c7d]">Save a draft after entering at least one detail. Complete all required fields before publishing. Publishing requires an approved company.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Job title *</span>
                  <input value={newListingForm.title} onChange={(event) => onFieldChange("title", event.target.value)} placeholder={newListingType === "ojt" ? "e.g. OJT Intern" : "e.g. Backend Developer"} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]" />
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Category *</span>
                  <select value={newListingForm.categoryId} onChange={(event) => onFieldChange("categoryId", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]">
                    <option value="">Select a category</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    <option value="other">Other</option>
                  </select>
                  {newListingForm.categoryId === "other" && (
                    <input
                      value={newListingForm.customCategoryName}
                      onChange={(event) => onFieldChange("customCategoryName", event.target.value)}
                      placeholder="Specify the category"
                      className="mt-2 w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]"
                    />
                  )}
                </label>
                <div className="md:col-span-2">
                  <LocationSelector
                    onChange={onLocationChange}
                    title="Job location *"
                    value={newListingForm.locationAddress}
                  />
                  <p className="mt-1 text-[10px] text-[#849293]">
                    Select a region and city or municipality. For on-site or hybrid roles, add the barangay and street address before publishing.
                  </p>
                </div>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Work setup *</span>
                  <select value={newListingForm.workSetup} onChange={(event) => onFieldChange("workSetup", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]">
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                    <option value="remote">Remote</option>
                  </select>
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Applicant limit *</span>
                  <input type="number" min="1" max="4294967295" step="1" value={newListingForm.applicantLimit} onChange={(event) => onFieldChange("applicantLimit", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]" />
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Expiration date (optional)</span>
                  <input type="date" value={newListingForm.expiresAt} onChange={(event) => onFieldChange("expiresAt", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]" />
                </label>
                {newListingType === "ojt" && <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Available slots *</span>
                  <input type="number" min="1" max="65535" step="1" value={newListingForm.availableSlots} onChange={(event) => onFieldChange("availableSlots", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]" />
                </label>
                }
                {newListingType === "ojt" && <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Required hours *</span>
                  <input type="number" min="1" max="65535" step="1" value={newListingForm.requiredHours} onChange={(event) => onFieldChange("requiredHours", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]" />
                </label>
                }
                {newListingType === "job" && <>
                  <label className="block text-[11px] font-medium text-[#445a5d]">
                    <span className="mb-1.5 block">Employment type *</span>
                    <select value={newListingForm.employmentType} onChange={(event) => onFieldChange("employmentType", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]">
                      <option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option>
                    </select>
                  </label>
                  <label className="block text-[11px] font-medium text-[#445a5d]">
                    <span className="mb-1.5 block">Work experience *</span>
                    <select
                      value={newListingForm.experienceRequirement}
                      onChange={(event) => onFieldChange("experienceRequirement", event.target.value)}
                      className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]"
                    >
                      <option value="without_experience">Without Experience</option>
                      <option value="with_experience">With Experience</option>
                    </select>
                  </label>
                  {newListingForm.experienceRequirement === "with_experience" && (
                    <label className="block text-[11px] font-medium text-[#445a5d]">
                      <span className="mb-1.5 block">Minimum years of experience *</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        step="1"
                        required
                        value={newListingForm.minimumExperienceYears}
                        onChange={(event) => onFieldChange("minimumExperienceYears", event.target.value)}
                        className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]"
                      />
                    </label>
                  )}
                  <label className="block text-[11px] font-medium text-[#445a5d]">
                    <span className="mb-1.5 block">Minimum salary</span>
                    <input aria-describedby={salaryRangeError ? "listing-salary-error" : undefined} aria-invalid={Boolean(salaryRangeError)} type="text" inputMode="numeric" pattern="[0-9]{0,9}" maxLength={9} value={newListingForm.salaryMin} onChange={(event) => onFieldChange("salaryMin", event.target.value.replace(/\D/g, ""))} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]" />
                  </label>
                  <label className="block text-[11px] font-medium text-[#445a5d]">
                    <span className="mb-1.5 block">Maximum salary</span>
                    <input aria-describedby={salaryRangeError ? "listing-salary-error" : undefined} aria-invalid={Boolean(salaryRangeError)} type="text" inputMode="numeric" pattern="[0-9]{0,9}" maxLength={9} value={newListingForm.salaryMax} onChange={(event) => onFieldChange("salaryMax", event.target.value.replace(/\D/g, ""))} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]" />
                  </label>
                  {salaryRangeError && (
                    <p className="col-span-full text-[10px] text-red-700" id="listing-salary-error" role="alert">
                      {salaryRangeError}
                    </p>
                  )}
                </>}
                {newListingType === "ojt" && <>
                  <label className="block text-[11px] font-medium text-[#445a5d]">
                    <span className="mb-1.5 block">Allowance</span>
                    <select value={newListingForm.allowanceType} onChange={(event) => onFieldChange("allowanceType", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]"><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
                  </label>
                  {newListingForm.allowanceType === "paid" && <label className="block text-[11px] font-medium text-[#445a5d]">
                    <span className="mb-1.5 block">Monthly allowance</span>
                    <input type="number" min="0" max="4294967295" step="1" value={newListingForm.allowanceAmount} onChange={(event) => onFieldChange("allowanceAmount", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]" />
                  </label>}
                  <label className="block text-[11px] font-medium text-[#445a5d]">
                    <span className="mb-1.5 block">Accepted courses (comma-separated)</span>
                    <input value={newListingForm.acceptedCourses} onChange={(event) => onFieldChange("acceptedCourses", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]" />
                  </label>
                  <label className="flex items-center gap-2 text-[11px] font-medium text-[#445a5d]">
                    <input type="checkbox" checked={newListingForm.moaAccepted === "true"} onChange={(event) => onFieldChange("moaAccepted", String(event.target.checked))} />
                    School MOA accepted
                  </label>
                </>}
              </div>

              <label className="mt-4 block text-[11px] font-medium text-[#445a5d]">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span>Listing summary *</span>
                  <span className="text-[10px] text-[#798e8f]">Shown to applicants</span>
                </div>
                <textarea value={newListingForm.summary} onChange={(event) => onFieldChange("summary", event.target.value)} placeholder="Describe the role, team, and impact of this opportunity." rows={4} className="w-full resize-none rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]" />
              </label>
              <label className="mt-4 block text-[11px] font-medium text-[#445a5d]">
                <span className="mb-1.5 block">Responsibilities *</span>
                <textarea value={newListingForm.responsibilities} onChange={(event) => onFieldChange("responsibilities", event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px]" />
              </label>
              <EditableListField
                label="Requirements *"
                onChange={(values) => onListChange("requirements", values)}
                placeholder="Add a requirement"
                values={newListingForm.requirements}
              />
              {newListingType === "job" && (
                <EditableListField
                  label="Required skills"
                  onChange={(values) => onListChange("requiredSkills", values)}
                  placeholder="Add a required skill"
                  titleCase
                  values={newListingForm.requiredSkills}
                />
              )}

              {error && <p className="mt-3 text-xs text-red-700" role="alert">{error}</p>}
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf1f0] pt-4">
                <button type="button" onClick={onBack} className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]">
                  ← Back
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onClose} className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]">
                    Cancel
                  </button>
                  <button aria-busy={isSaving} type="button" disabled={isSaving} onClick={onSaveDraft} className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0] disabled:opacity-50">
                    {isSaving && <span aria-hidden="true" className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                    {isSaving ? "Saving…" : "Save as draft"}
                  </button>
                  <button aria-busy={isSaving} type="button" disabled={isSaving} onClick={onPublish} className="rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a] disabled:opacity-50">
                    {isSaving && <span aria-hidden="true" className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                    {isSaving ? "Saving…" : "Publish listing"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
