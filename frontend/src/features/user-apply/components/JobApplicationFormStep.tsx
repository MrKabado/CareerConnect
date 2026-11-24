import { ApplicationFileUpload, ApplicationPrimaryButton } from "@/components/common/user/jobApplicationComponents";

type JobApplicationFormStepProps = {
  resumeError: string;
  resumeFileName?: string;
  resumeLoading: boolean;
  coverLetterFileName?: string;
  coverLetterLoading: boolean;
  coverLetterDocumentsLoading: boolean;
  coverLetterUploadProgress: number | null;
  coverLetterError: string;
  isCoverLetterIncluded: boolean;
  onCoverLetterSelect: (file: File) => void | Promise<void>;
  onCoverLetterToggle: (included: boolean) => void;
  submitError: string;
  onFileSelect: (file: File) => void;
  onReview: () => void;
};

export default function JobApplicationFormStep({
  resumeError,
  resumeFileName,
  resumeLoading,
  coverLetterFileName,
  coverLetterLoading,
  coverLetterDocumentsLoading,
  coverLetterUploadProgress,
  coverLetterError,
  isCoverLetterIncluded,
  onCoverLetterSelect,
  onCoverLetterToggle,
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
        <section aria-labelledby="application-cover-letter-label">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="application-cover-letter-label" className="text-xs font-medium text-[#526466]">
              Cover letter <span className="font-normal text-[#839192]">(optional document)</span>
            </h3>
            {coverLetterFileName && (
              <button
                className="text-[10px] font-semibold text-[#078b8d] hover:underline"
                onClick={() => onCoverLetterToggle(!isCoverLetterIncluded)}
                type="button"
              >
                {isCoverLetterIncluded ? "Skip for this application" : "Include saved file"}
              </button>
            )}
          </div>
          {coverLetterFileName ? (
            <div className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${isCoverLetterIncluded ? "border-[#dcece9] bg-[#f2f8f7]" : "border-[#e5ebeb] bg-white opacity-70"}`}>
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[10px] font-bold text-[#078b8d]">
                {coverLetterFileName.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-[#354346]">{coverLetterFileName}</p>
                <p className="mt-0.5 text-[9px] text-[#839192]">
                  {isCoverLetterIncluded ? "Included with your application" : "Saved in your profile"}
                </p>
              </div>
            </div>
          ) : coverLetterDocumentsLoading ? (
            <p className="mt-1 text-[10px] text-[#839192]" role="status">
              Checking for a saved cover letter…
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-[#839192]">
              Upload a saved cover letter document if you want to include one.
            </p>
          )}
          <label className={`mt-2 inline-flex cursor-pointer items-center rounded-lg border border-[#dce9e7] px-3 py-2 text-[10px] font-semibold text-[#078b8d] hover:bg-[#f4faf9] focus-within:outline-[3px] focus-within:outline-[#67c9c1] ${coverLetterLoading || coverLetterDocumentsLoading ? "cursor-wait opacity-60" : ""}`}>
            {coverLetterLoading
              ? "Uploading cover letter…"
              : coverLetterDocumentsLoading
                ? "Checking saved documents…"
                : coverLetterFileName ? "Replace document" : "Upload cover letter"}
            <input
              accept=".pdf,.docx"
              className="sr-only"
              disabled={coverLetterLoading || coverLetterDocumentsLoading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void onCoverLetterSelect(file);
              }}
              type="file"
            />
          </label>
          {coverLetterUploadProgress !== null && (
            <p className="mt-2 text-[10px] text-[#078b8d]" role="status">
              Uploading cover letter… {coverLetterUploadProgress}%
            </p>
          )}
          {coverLetterError && <p className="mt-2 text-[10px] text-[#b34840]" role="alert">{coverLetterError}</p>}
        </section>
      </div>

      {submitError && <p className="mt-3 text-[10px] text-[#b34840]" role="alert">{submitError}</p>}
      <div className="mt-5 flex justify-end">
        <ApplicationPrimaryButton
          disabled={resumeLoading || coverLetterLoading || coverLetterDocumentsLoading}
          onClick={onReview}
        >
          Review application <span aria-hidden="true">→</span>
        </ApplicationPrimaryButton>
      </div>
    </>
  );
}
