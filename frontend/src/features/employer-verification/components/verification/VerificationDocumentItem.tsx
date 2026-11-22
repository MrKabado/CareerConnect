import { useState } from "react";
import {
  verificationDocumentRequirements,
  type VerificationDocumentKind,
} from "@/features/employer-verification/types";
import type { EmployerVerificationDocument } from "@/features/employer-verification/types";

type VerificationDocumentItemProps = {
  requirement: (typeof verificationDocumentRequirements)[number];
  document: EmployerVerificationDocument | undefined;
  uploading: VerificationDocumentKind | null;
  uploadProgress: number;
  submitting: boolean;
  uploadError?: string | null;
  onFileChange: (kind: VerificationDocumentKind, file?: File) => void | Promise<void>;
  onRemove: (kind: VerificationDocumentKind) => void | Promise<void>;
  onDownload: (documentId: string, fileName: string) => void | Promise<void>;
  removing: boolean;
};

export default function VerificationDocumentItem({
  requirement,
  document,
  uploading,
  uploadProgress,
  submitting,
  uploadError,
  onFileChange,
  onRemove,
  onDownload,
  removing,
}: VerificationDocumentItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = `verification-file-${requirement.kind}`;

  return (
    <section className="rounded-xl border border-[#e5eeec] bg-[#fbfdfd] p-4" key={requirement.kind}>
      <div>
        <span className="block text-sm font-semibold text-[#314547]">
          {requirement.label}
          <span className="ml-1 text-[#ba564d]" aria-hidden="true">*</span>
        </span>
        <span className="mt-1 block text-xs text-[#78888a]">
          PDF, JPG, or PNG · up to 5 MB per file. If the file is larger, compress or reduce its size before uploading.
        </span>
        <div
          className={`mt-3 rounded-xl border border-dashed px-4 py-5 text-center transition ${
            isDragging
              ? "border-[#078b8d] bg-[#edf9f7]"
              : "border-[#cadbd8] bg-white"
          } ${submitting || uploading !== null ? "cursor-not-allowed opacity-60" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!submitting && uploading === null) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            if (!submitting && uploading === null) setIsDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!submitting && uploading === null) {
              void onFileChange(requirement.kind, event.dataTransfer.files.item(0) ?? undefined);
            }
          }}
        >
          <input
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            aria-label={`Upload ${requirement.label}`}
            className="sr-only"
            disabled={uploading !== null || submitting}
            id={inputId}
            onChange={(event) => {
              void onFileChange(requirement.kind, event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
            type="file"
          />
          <p className="text-xs text-[#657779]">Drag and drop your file here</p>
          <label
            className="mt-1 inline-block cursor-pointer text-xs font-semibold text-[#087879] underline underline-offset-2"
            htmlFor={inputId}
          >
            Browse files
          </label>
        </div>
        {uploadError && (
          <p className="mt-2 text-xs text-[#a2534c]" role="alert">
            {uploadError}
          </p>
        )}
      </div>
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
          <div className="flex items-center gap-2 text-[#087879]" aria-live="polite">
            <span>Uploading… {uploadProgress}%</span>
            <progress aria-label={`Uploading ${requirement.label}`} max={100} value={uploadProgress} />
          </div>
        )}
        {document && (
          <div className="flex gap-3">
            <button
              className="font-semibold text-[#087879] underline underline-offset-2 disabled:opacity-50"
              disabled={removing || submitting || uploading !== null}
              onClick={() => void onDownload(document.id, document.fileName)}
              type="button"
            >
              Download
            </button>
            <button
              className="font-semibold text-[#a2534c] underline underline-offset-2 disabled:opacity-50"
              disabled={removing || submitting || uploading !== null}
              onClick={() => void onRemove(requirement.kind)}
              type="button"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
