import { useState } from "react";
import { Check, CheckCircle2, FileText, XCircle } from "lucide-react";
import { Button, Modal } from "../../common";
import type { EmployerVerification } from "../../../types";

const CHECKLIST = [
  "Business name matches the submission",
  "Registration number is valid",
  "Document is current and not expired",
  "Signatory matches the submitting user",
];

interface DocumentPreviewModalProps {
  item: EmployerVerification;
  initialDocumentId: string;
  /** Open straight into the rejection-reason step (used by the row's Reject button). */
  startRejecting?: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

/**
 * Covers the four Figma states:
 *  1. pending, checklist incomplete  2. pending, checklist complete
 *  3. rejecting (reason required)    4. already approved / rejected (read-only)
 */
export default function DocumentPreviewModal({
  item,
  initialDocumentId,
  startRejecting = false,
  onClose,
  onApprove,
  onReject,
}: DocumentPreviewModalProps) {
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [rejecting, setRejecting] = useState(startRejecting);
  const [reason, setReason] = useState("");

  const doc = item.documents.find((d) => d.id === documentId) ?? item.documents[0];
  const isPending = item.status === "pending";
  const allChecked = checked.every(Boolean);
  const checkedCount = isPending ? checked.filter(Boolean).length : CHECKLIST.length;
  const docTitle = doc.name.replace(/\.pdf$/i, "");

  const toggle = (index: number) =>
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));

  return (
    <Modal
      title="Document preview"
      subtitle={`${item.company} · Submitted ${item.submittedAt}`}
      onClose={onClose}
      widthClass="max-w-3xl"
    >
      <div className="grid gap-5 p-6 md:grid-cols-[1fr_17rem]">
        {/* Document */}
        <div>
          {item.documents.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {item.documents.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDocumentId(d.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    d.id === doc.id
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl bg-canvas p-4">
            {doc.url ? (
              <iframe
                title={doc.name}
                src={doc.url}
                className="h-105 w-full rounded-lg bg-white"
              />
            ) : (
              <div className="min-h-105 rounded-lg border border-line bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      Official document
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{docTitle}</h3>
                  </div>
                  <FileText size={22} className="text-muted" aria-hidden="true" />
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <PreviewField label="Business name" value={item.company} />
                  <PreviewField label="File" value={doc.name} />
                  <PreviewField label="Submitted by" value={item.submittedBy} />
                  <PreviewField label="Submitted on" value={item.submittedAt} />
                </dl>

                <p className="mt-8 border-t border-dashed border-line pt-4 text-xs text-muted">
                  Preview placeholder. Set <code>url</code> on the document to embed
                  the real file here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Verification panel */}
        <aside className="flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Verification checklist</h3>
            <span className="text-xs text-muted">
              {checkedCount} of {CHECKLIST.length}
            </span>
          </div>

          <ul className="mt-3 space-y-2">
            {CHECKLIST.map((label, i) => {
              const isChecked = isPending ? checked[i] : item.status === "approved";
              return (
                <li key={label}>
                  <label
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs ${
                      isChecked ? "border-brand-100 bg-brand-50" : "border-line"
                    } ${isPending ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!isPending}
                      onChange={() => toggle(i)}
                      className="mt-0.5 accent-brand-600"
                    />
                    <span>{label}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 space-y-2">
            {isPending && !rejecting && (
              <>
                <Button
                  className="w-full"
                  icon={<Check size={14} />}
                  disabled={!allChecked}
                  onClick={() => onApprove(item.id)}
                >
                  Approve employer
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setRejecting(true)}
                >
                  Reject…
                </Button>
                {!allChecked && (
                  <p className="text-center text-[11px] text-muted">
                    Complete the checklist to approve.
                  </p>
                )}
              </>
            )}

            {isPending && rejecting && (
              <>
                <label htmlFor="reject-reason" className="block text-xs font-medium">
                  Reason for rejection
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell the employer what to fix"
                  className="w-full resize-none rounded-xl border border-line px-3 py-2 text-xs outline-none focus:border-brand-600"
                />
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={reason.trim().length === 0}
                  onClick={() => onReject(item.id, reason.trim())}
                >
                  Confirm rejection
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setRejecting(false)}
                >
                  Back
                </Button>
              </>
            )}

            {item.status === "approved" && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>This employer has been approved and can publish jobs.</span>
              </div>
            )}

            {item.status === "rejected" && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800">
                <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Rejected.
                  {item.rejectionReason ? ` Reason: ${item.rejectionReason}` : ""}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 border-b border-line pb-2 font-medium">{value}</dd>
    </div>
  );
}
