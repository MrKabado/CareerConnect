type CreateListingModalProps = {
  companyName: string;
  isOpen: boolean;
  newListingType: "job" | "ojt" | null;
  newListingStep: 1 | 2;
  modalTitle: string;
  newListingForm: {
    title: string;
    department: string;
    location: string;
    workSetup: string;
    availableSlots: string;
    requiredHours: string;
    summary: string;
  };
  onClose: () => void;
  onTypePick: (type: "job" | "ojt") => void;
  onBack: () => void;
  onFieldChange: (field: keyof CreateListingModalProps["newListingForm"], value: string) => void;
  onSaveDraft: () => void;
};

export default function CreateListingModal({
  companyName,
  isOpen,
  newListingType,
  newListingStep,
  modalTitle,
  newListingForm,
  onClose,
  onTypePick,
  onBack,
  onFieldChange,
  onSaveDraft,
}: CreateListingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c4f53]/40 px-4 backdrop-blur-[1px]">
      <div className="w-full max-w-[680px] overflow-hidden rounded-[18px] border border-[#dfeae8] bg-[#f4f8f8] shadow-[0_30px_80px_rgba(24,48,51,0.22)]">
        <div className="flex items-center justify-between border-b border-[#edf2f0] bg-[#f7fbfa] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#dff4ef] text-[11px] font-bold text-[#0d8fa2]">
              {newListingType ? "2" : "1"}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#688082]">
              {newListingType ? `Step ${newListingStep} of 2` : "New listing"}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-[11px] font-medium text-[#5c7174] transition hover:text-[#1e3437]">
            Close
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 text-[#1d3133]">
          {newListingStep === 1 ? (
            <>
              <div className="mb-4">
                <h2 className="text-[15px] font-bold tracking-[-0.04em] text-[#1d3133]">What are you hiring for?</h2>
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
                <h2 className="text-[15px] font-bold tracking-[-0.04em] text-[#1d3133]">{modalTitle}</h2>
                <p className="mt-1 text-[11px] text-[#677c7d]">Review the prefilled company details and save your listing as a draft.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Job title *</span>
                  <input value={newListingForm.title} onChange={(event) => onFieldChange("title", event.target.value)} placeholder={newListingType === "ojt" ? "e.g. OJT Intern" : "e.g. Backend Developer"} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]" />
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Department *</span>
                  <input value={newListingForm.department} onChange={(event) => onFieldChange("department", event.target.value)} placeholder="e.g. Platform Engineering" className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]" />
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Location *</span>
                  <input value={newListingForm.location} onChange={(event) => onFieldChange("location", event.target.value)} placeholder="BGC, Taguig City" className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]" />
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Work setup *</span>
                  <select value={newListingForm.workSetup} onChange={(event) => onFieldChange("workSetup", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]">
                    <option>Hybrid</option>
                    <option>On-site</option>
                    <option>Remote</option>
                  </select>
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Available slots *</span>
                  <input value={newListingForm.availableSlots} onChange={(event) => onFieldChange("availableSlots", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]" />
                </label>
                <label className="block text-[11px] font-medium text-[#445a5d]">
                  <span className="mb-1.5 block">Required hours *</span>
                  <input value={newListingForm.requiredHours} onChange={(event) => onFieldChange("requiredHours", event.target.value)} className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] outline-none transition focus:border-[#b8dde0]" />
                </label>
              </div>

              <label className="mt-4 block text-[11px] font-medium text-[#445a5d]">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span>Listing summary *</span>
                  <span className="text-[10px] text-[#798e8f]">Shown to applicants</span>
                </div>
                <textarea value={newListingForm.summary} onChange={(event) => onFieldChange("summary", event.target.value)} placeholder="Describe the role, team, and impact of this opportunity." rows={4} className="w-full resize-none rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-[12px] text-[#1d3133] placeholder:text-[#8a9b9d] outline-none transition focus:border-[#b8dde0]" />
              </label>

              <div className="mt-3 rounded-[10px] border border-[#dfeae8] bg-[#edf9f6] px-3 py-2 text-[10px] leading-5 text-[#476368]">
                <span className="mr-2 text-[#0d8fa2]">•</span>
                Company support and eligible counselors will be included from employer onboarding.
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf1f0] pt-4">
                <button type="button" onClick={onBack} className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]">
                  ← Back
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onClose} className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]">
                    Cancel
                  </button>
                  <button type="button" onClick={onSaveDraft} className="rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]">
                    Save as draft
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
