import { useState } from "react";
import ApplicantDialog from "@/features/employer-applicants/components/ApplicantDialog";
import type { OfferDetails } from "@/features/employer-applicants/types";

type ExtendOfferDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  onSubmit: (details: OfferDetails) => Promise<boolean>;
};

function localDateValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export default function ExtendOfferDialog({ open, isSubmitting, error, onRetry, onClose, onSubmit }: ExtendOfferDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const date = new Date(`${startDate}T00:00:00`);
    const today = new Date(`${localDateValue()}T00:00:00`);
    if (Number.isNaN(date.getTime()) || date < today) {
      setValidationError("Choose today or a future start date.");
      return;
    }
    setValidationError(null);
    const submitted = await onSubmit({ startDate, ...(notes.trim() ? { notes: notes.trim() } : {}) });
    if (submitted) onClose();
  }

  return (
    <ApplicantDialog open={open} title="Extend an offer" error={error} onRetry={onRetry} isRetrying={isSubmitting} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block text-xs font-medium text-[#496264]">
          Proposed start date
          <input data-dialog-initial type="date" min={localDateValue()} required value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
        </label>
        <label className="block text-xs font-medium text-[#496264]">
          Notes or message <span className="font-normal text-[#829293]">(optional)</span>
          <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add offer details or a note for the applicant" className="mt-1.5 w-full resize-y rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
        </label>
        <p className="rounded-md bg-[#f1f8f7] px-3 py-2 text-xs text-[#507174]">Applicant will be notified when the offer is recorded.</p>
        {validationError ? <p className="text-xs text-[#b85054]" role="alert">{validationError}</p> : null}
        <div className="flex justify-end gap-2 border-t border-[#e7efee] pt-4">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-sm font-medium text-[#4a6467] disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#0e8e9b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? "Saving..." : "Extend offer"}</button>
        </div>
      </form>
    </ApplicantDialog>
  );
}