import { useState } from "react";
import ApplicantDialog from "@/features/employer-applicants/components/ApplicantDialog";
import type { ApplicantStatusUpdatePayload } from "@/features/employer-applicants/types";

type RejectDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  onSubmit: (payload: ApplicantStatusUpdatePayload) => Promise<boolean>;
};

const messageTemplates = [
  { value: "thanks", label: "Thank them for applying", message: "Thank you for taking the time to apply. We appreciate your interest and wish you the best in your search." },
  { value: "alignment", label: "Role alignment", message: "We have decided to move forward with candidates whose experience more closely matches the current needs of this role." },
  { value: "custom", label: "Write a custom message", message: "" },
] as const;

export default function RejectDialog({ open, isSubmitting, error, onRetry, onClose, onSubmit }: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [template, setTemplate] = useState<(typeof messageTemplates)[number]["value"]>("thanks");
  const [customMessage, setCustomMessage] = useState("");
  const message = template === "custom" ? customMessage : messageTemplates.find((item) => item.value === template)?.message ?? "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    const submitted = await onSubmit({
      ...(trimmedReason ? { rejectionReason: trimmedReason, note: trimmedReason } : {}),
      rejectionMessage: message,
    });
    if (submitted) onClose();
  }

  return (
    <ApplicantDialog open={open} title="Reject applicant?" role="alertdialog" error={error} onRetry={onRetry} isRetrying={isSubmitting} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-sm leading-6 text-[#5b7072]">The applicant will move to Rejected. You can undo this change for 8 seconds.</p>
        <label className="block text-xs font-medium text-[#496264]">
          Reason <span className="font-normal text-[#829293]">(optional)</span>
          <textarea data-dialog-initial rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add an internal reason" className="mt-1.5 w-full resize-y rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
        </label>
        <label className="block text-xs font-medium text-[#496264]">
          Message template
          <select value={template} onChange={(event) => setTemplate(event.target.value as typeof template)} className="mt-1.5 w-full rounded-lg border border-[#d7e6e5] bg-white px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]">
            {messageTemplates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {template === "custom" ? (
          <label className="block text-xs font-medium text-[#496264]">
            Applicant message
            <textarea rows={3} value={customMessage} onChange={(event) => setCustomMessage(event.target.value)} placeholder="Write a respectful message" className="mt-1.5 w-full resize-y rounded-lg border border-[#d7e6e5] px-3 py-2.5 text-sm text-[#243b3d] outline-none focus:border-[#55a8a8]" />
          </label>
        ) : null}
        <p className="rounded-md bg-[#f1f8f7] px-3 py-2 text-xs text-[#507174]">Applicant will be notified about this decision.</p>
        <div className="flex justify-end gap-2 border-t border-[#e7efee] pt-4">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-sm font-medium text-[#4a6467] disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg border border-[#cc7275] bg-white px-4 py-2 text-sm font-semibold text-[#a7464b] disabled:opacity-60">{isSubmitting ? "Rejecting..." : "Confirm rejection"}</button>
        </div>
      </form>
    </ApplicantDialog>
  );
}