import { ApplicationFileUpload, ApplicationPrimaryButton } from "@/components/common/user/jobApplicationComponents";

type JobApplicationFormStepProps = {
  resumeError: string;
  resumeFileName?: string;
  resumeLoading: boolean;
  coverLetter: string;
  onCoverLetterChange: (value: string) => void;
  submitError: string;
  onFileSelect: (file: File) => void;
  onReview: () => void;
};

export default function JobApplicationFormStep({
  resumeError,
  resumeFileName,
  resumeLoading,
  coverLetter,
  onCoverLetterChange,
  submitError,
  onFileSelect,
  onReview,
}: JobApplicationFormStepProps) {
  return (
    <>
      <h2 className="text-[15px] font-bold text-[#2c3e40]">Your application</h2>
      <p className="mt-1 text-[10px] text-[#839192]">
        Use your saved resume or upload a replacement. Your application is submitted to the listing owner.
      </p>

      <div className="mt-4 space-y-4">
        <ApplicationFileUpload
          error={resumeError}
          fileName={resumeLoading ? "Checking saved resume…" : resumeFileName}
          helperText="PDF or DOCX up to 5 MB"
          label="Resume"
          onSelect={onFileSelect}
          required
        />
        <label className="block text-xs font-medium text-[#526466]" htmlFor="application-cover-letter">
          Cover letter <span className="font-normal text-[#839192]">(optional)</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[#e5ebeb] bg-white px-3 py-2 text-xs text-[#354346] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/10"
            id="application-cover-letter"
            maxLength={10000}
            onChange={(event) => onCoverLetterChange(event.target.value)}
            placeholder="Introduce yourself and explain your interest in this opportunity."
            value={coverLetter}
          />
          <span className="mt-1 block text-right text-[10px] text-[#839192]">
            {coverLetter.length}/10,000
          </span>
        </label>
      </div>

      {submitError && <p className="mt-3 text-[10px] text-[#b34840]" role="alert">{submitError}</p>}
      <div className="mt-5 flex justify-end">
        <ApplicationPrimaryButton disabled={resumeLoading} onClick={onReview}>
          Review application <span aria-hidden="true">→</span>
        </ApplicationPrimaryButton>
      </div>
    </>
  );
}
