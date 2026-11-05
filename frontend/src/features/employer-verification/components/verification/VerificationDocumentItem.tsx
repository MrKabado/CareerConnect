import { fileInputClassName } from "@/features/employer-verification/constants";
import {
  verificationDocumentRequirements,
  type VerificationDocumentKind,
} from "@/features/employer-verification/types";
import type { EmployerVerificationDocument } from "@/features/employer-verification/types";

type VerificationDocumentItemProps = {
  requirement: (typeof verificationDocumentRequirements)[number];
  document: EmployerVerificationDocument | undefined;
  uploading: VerificationDocumentKind | null;
  submitting: boolean;
  onFileChange: (kind: VerificationDocumentKind, file?: File) => void | Promise<void>;
};

export default function VerificationDocumentItem({
  requirement,
  document,
  uploading,
  submitting,
  onFileChange,
}: VerificationDocumentItemProps) {
  return (
    <section className="rounded-xl border border-[#e5eeec] bg-[#fbfdfd] p-4" key={requirement.kind}>
      <label className="block">
        <span className="block text-sm font-semibold text-[#314547]">
          {requirement.label}
          <span className="ml-1 text-[#ba564d]" aria-hidden="true">*</span>
        </span>
        <span className="mt-1 block text-xs text-[#78888a]">
          PDF, JPG, or PNG · up to 10 MB
        </span>
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          aria-label={`Upload ${requirement.label}`}
          className={`${fileInputClassName} mt-3`}
          disabled={uploading !== null || submitting}
          onChange={(event) => {
            void onFileChange(requirement.kind, event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
          type="file"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        {document ? (
          <>
            <span className="break-all font-medium text-[#314547]">{document.fileName}</span>
            <span className="text-[#228578]">Uploaded</span>
          </>
        ) : (
          <span className="text-[#9b5b40]">Required — not uploaded</span>
        )}
        {uploading === requirement.kind && (
          <span aria-live="polite" className="text-[#087879]">
            Uploading…
          </span>
        )}
      </div>
    </section>
  );
}
