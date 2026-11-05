import {
  ApplicationFileUpload,
  ApplicationPrimaryButton,
} from "@/components/common/user/jobApplicationComponents";
import type { ApplicationFileKind } from "@/features/user-apply/types";

type JobApplicationFormStepProps = {
  track: "Job" | "OJT";
  resumeError: string;
  letterError: string;
  coverLetterError: string;
  resumeFileName?: string;
  applicationLetterFileName?: string;
  coverLetterFileName?: string;
  submitError: string;
  onFileSelect: (file: File, kind: ApplicationFileKind) => void;
  onReview: () => void;
};

export default function JobApplicationFormStep({
  track,
  resumeError,
  letterError,
  coverLetterError,
  resumeFileName,
  applicationLetterFileName,
  coverLetterFileName,
  submitError,
  onFileSelect,
  onReview,
}: JobApplicationFormStepProps) {
  return (
    <>
      <h2 className="text-[15px] font-bold text-[#2c3e40]">
        {track === "OJT" ? "Your OJT application" : "Your application"}
      </h2>
      <p className="mt-1 text-[10px] text-[#839192]">
        {track === "OJT"
          ? "Attach your resume and optional application letter. Your school and training details will be included for review."
          : "Add the documents you’d like to share with the hiring team."}
      </p>

      <div className="mt-4 space-y-4">
        <ApplicationFileUpload
          error={resumeError}
          fileName={resumeFileName}
          helperText="PDF, DOC, or DOCX up to 10 MB"
          label="Resume"
          onSelect={(file) => onFileSelect(file, "resume")}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ApplicationFileUpload
            error={letterError}
            fileName={applicationLetterFileName}
            helperText="PDF, DOC, or DOCX up to 10 MB"
            label="Application Letter"
            onSelect={(file) => onFileSelect(file, "letter")}
          />
          <ApplicationFileUpload
            error={coverLetterError}
            fileName={coverLetterFileName}
            helperText="PDF, DOC, or DOCX up to 10 MB"
            label="Cover Letter"
            onSelect={(file) => onFileSelect(file, "cover-letter")}
          />
        </div>
      </div>

      {submitError && <p className="mt-3 text-[10px] text-[#b34840]">{submitError}</p>}
      <div className="mt-5 flex justify-end">
        <ApplicationPrimaryButton onClick={onReview}>
          Review application <span aria-hidden="true">→</span>
        </ApplicationPrimaryButton>
      </div>
    </>
  );
}
