import { workspaceOptions, formFieldLabels } from "@/features/employer-hiring-setup/constants";
import type { HiringSetupDraft } from "@/features/employer-hiring-setup/types";

type HiringSetupFormProps = {
  draft: HiringSetupDraft;
  onFieldChange: (field: keyof HiringSetupDraft, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export default function HiringSetupForm({ draft, onFieldChange, onSave, onCancel }: HiringSetupFormProps) {
  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-8">
      <div className="rounded-[20px] border border-[#dfeae8] bg-white p-5 shadow-[0_10px_22px_rgba(31,51,52,0.03)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0d8fa2]">Employer setup</p>
            <h1 className="mt-2 text-[24px] font-bold tracking-[-0.08em] text-[#1d3133]">Edit hiring setup</h1>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]"
          >
            Cancel
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-[11px] font-medium text-[#445a5d]">
            <span className="mb-1.5 block">{formFieldLabels.title}</span>
            <input
              value={draft.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              className="w-full rounded-xl border border-[#dfe8e7] bg-[#f8fbfb] px-3 py-2.5 text-[12px] text-[#1d3133] outline-none focus:border-[#b8dde0]"
            />
          </label>

          <label className="block text-[11px] font-medium text-[#445a5d]">
            <span className="mb-1.5 block">{formFieldLabels.department}</span>
            <input
              value={draft.department}
              onChange={(event) => onFieldChange("department", event.target.value)}
              className="w-full rounded-xl border border-[#dfe8e7] bg-[#f8fbfb] px-3 py-2.5 text-[12px] text-[#1d3133] outline-none focus:border-[#b8dde0]"
            />
          </label>

          <label className="block text-[11px] font-medium text-[#445a5d]">
            <span className="mb-1.5 block">{formFieldLabels.location}</span>
            <input
              value={draft.location}
              onChange={(event) => onFieldChange("location", event.target.value)}
              className="w-full rounded-xl border border-[#dfe8e7] bg-[#f8fbfb] px-3 py-2.5 text-[12px] text-[#1d3133] outline-none focus:border-[#b8dde0]"
            />
          </label>

          <label className="block text-[11px] font-medium text-[#445a5d]">
            <span className="mb-1.5 block">{formFieldLabels.workspace}</span>
            <select
              value={draft.workspace}
              onChange={(event) => onFieldChange("workspace", event.target.value)}
              className="w-full rounded-xl border border-[#dfe8e7] bg-[#f8fbfb] px-3 py-2.5 text-[12px] text-[#1d3133] outline-none focus:border-[#b8dde0]"
            >
              {workspaceOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] font-medium text-[#445a5d] md:col-span-2">
            <span className="mb-1.5 block">{formFieldLabels.schoolPartnerships}</span>
            <textarea
              rows={3}
              value={draft.schoolPartnerships}
              onChange={(event) => onFieldChange("schoolPartnerships", event.target.value)}
              className="w-full resize-none rounded-xl border border-[#dfe8e7] bg-[#f8fbfb] px-3 py-2.5 text-[12px] text-[#1d3133] outline-none focus:border-[#b8dde0]"
            />
          </label>

          <label className="block text-[11px] font-medium text-[#445a5d] md:col-span-2">
            <span className="mb-1.5 block">{formFieldLabels.acceptedCourses}</span>
            <input
              value={draft.acceptedCourses}
              onChange={(event) => onFieldChange("acceptedCourses", event.target.value)}
              className="w-full rounded-xl border border-[#dfe8e7] bg-[#f8fbfb] px-3 py-2.5 text-[12px] text-[#1d3133] outline-none focus:border-[#b8dde0]"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]"
          >
            Save changes
          </button>
        </div>
      </div>
    </main>
  );
}
