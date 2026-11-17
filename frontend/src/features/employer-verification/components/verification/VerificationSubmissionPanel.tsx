import { verificationDocumentRequirements } from "@/features/employer-verification/types";
import { verificationNoticeText } from "@/features/employer-verification/constants";

type VerificationSubmissionPanelProps = {
  documentsCount: number;
  allDocumentsUploaded: boolean;
  submitting: boolean;
  uploading: boolean;
  onSubmit: () => void | Promise<void>;
  uploadError: string | null;
  submitError: string | null;
};

export default function VerificationSubmissionPanel({
  documentsCount,
  allDocumentsUploaded,
  submitting,
  uploading,
  onSubmit,
  uploadError,
  submitError,
}: VerificationSubmissionPanelProps) {
  return (
    <>
      <p className="mt-5 rounded-xl bg-[#f3f8f7] p-4 text-xs leading-5 text-[#657779]">
        {verificationNoticeText}
      </p>

      {uploadError && (
        <p className="mt-4 text-sm text-[#a2534c]" role="alert">
          {uploadError}
        </p>
      )}
      {submitError && (
        <p className="mt-4 text-sm text-[#a2534c]" role="alert">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
        <span className="text-xs text-[#718082]">
          {documentsCount} of {verificationDocumentRequirements.length} required documents uploaded
        </span>
        <button
          className="rounded-xl bg-[#0d8fa2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b7a89] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!allDocumentsUploaded || submitting || uploading}
          onClick={() => void onSubmit()}
          type="button"
        >
          {submitting ? "Submitting…" : "Submit for verification"}
        </button>
      </div>
    </>
  );
}
