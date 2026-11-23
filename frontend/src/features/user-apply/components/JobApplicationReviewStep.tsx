import { ApplicationPrimaryButton, ApplicationReviewRow } from "@/components/common/user/jobApplicationComponents";
import type { ApplicationOpportunity } from "@/features/user-apply/types";

type JobApplicationReviewStepProps = {
  opportunity: ApplicationOpportunity;
  resumeName?: string;
  coverLetterFileName?: string;
  submitError: string;
  isSubmitting: boolean;
  uploadProgress: number | null;
  onBack: () => void;
  onSubmit: () => void | Promise<void>;
};

export default function JobApplicationReviewStep({
  opportunity,
  resumeName,
  coverLetterFileName,
  submitError,
  isSubmitting,
  uploadProgress,
  onBack,
  onSubmit,
}: JobApplicationReviewStepProps) {
  return (
    <>
      <h2 className="text-[15px] font-bold text-[#2c3e40]">Review your application</h2>
      <p className="mt-1 text-[10px] text-[#839192]">
        Confirm the listing and information that will be sent to the employer.
      </p>

      <div className="mt-4 space-y-3">
        <ApplicationReviewRow label="Position" value={`${opportunity.title} at ${opportunity.company}`} />
        <ApplicationReviewRow label="Resume" value={resumeName ?? "Not included"} />
        <ApplicationReviewRow label="Cover letter" value={coverLetterFileName ?? "Not included"} />
      </div>

      {uploadProgress !== null && (
        <p aria-live="polite" className="mt-3 text-[10px] text-[#16878b]">
          Uploading resume: {uploadProgress}%
        </p>
      )}
      {submitError ? (
        <p className="mt-3 text-[10px] text-[#b34840]" role="alert">{submitError}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="min-h-10 rounded-[9px] border border-[#e2eaea] bg-white px-4 text-[11px] font-semibold text-[#536769] hover:bg-[#f7faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          Back
        </button>
        <ApplicationPrimaryButton disabled={isSubmitting} onClick={() => void onSubmit()}>
          {isSubmitting && <span aria-hidden="true" className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />}
          {isSubmitting ? "Submitting…" : "Submit application"}
        </ApplicationPrimaryButton>
      </div>
    </>
  );
}
