import { useState, type ChangeEvent, type DragEvent } from "react";
import type { OnboardingAnswers } from "@/features/onboarding/store";

type JobStep6Props = {
  answers: OnboardingAnswers;
  isSubmitting: boolean;
  isResumeUploaded: boolean;
  isResumeAlreadyUploaded?: boolean;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
};

const maxResumeSize = 5 * 1024 * 1024;
const allowedExtensions = /\.(pdf|docx)$/i;
const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export default function JobStep6({
  answers,
  isSubmitting,
  isResumeUploaded,
  isResumeAlreadyUploaded = false,
  onChange,
}: JobStep6Props) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function setResume(file: File | undefined) {
    if (!file) return;
    if (isResumeAlreadyUploaded) {
      setFileError("A resume is already saved to your profile.");
      return;
    }
    const exactFilename = /^resume\.(pdf|docx)$/i.test(file.name);
    if (!exactFilename) {
      setFileError("Rename the file to resume.pdf or resume.docx before uploading.");
      return;
    }
    const validType =
      allowedTypes.has(file.type) ||
      (!file.type && allowedExtensions.test(file.name));
    if (!validType || !allowedExtensions.test(file.name)) {
      setFileError("Choose a PDF or DOCX file.");
      return;
    }
    if (file.size > maxResumeSize) {
      setFileError("Your resume must be 5 MB or smaller.");
      return;
    }

    setFileError(null);
    onChange("resumeFile", file);
    onChange("resumeSkipped", false);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setResume(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isSubmitting) return;
    setResume(event.dataTransfer.files[0]);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#354346]">
        <span>Resume</span>
        <span className="font-normal text-[#9ba6a7]">Optional</span>
      </div>
      <label
        className={`flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-5 text-center transition ${
          isSubmitting || isResumeAlreadyUploaded ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${
          isDragging
            ? "border-[#078b8d] bg-[#edf9f7]"
            : "border-[#cbdede] bg-[#f7fbfa] hover:border-[#078b8d]"
        }`}
        htmlFor="job-resume-upload"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="mb-3 grid size-9 place-items-center rounded-xl bg-white text-[#078b8d] shadow-sm">
          <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v4h14v-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>
        <span className="text-sm font-semibold text-[#354346]">
          {isResumeAlreadyUploaded
            ? "Resume already saved"
            : answers.resumeFile?.name ?? "Choose a file or drag it here"}
        </span>
        <span className="mt-1 text-xs text-[#8a9899]">
          PDF or DOCX up to 5 MB
        </span>
        <input
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          id="job-resume-upload"
          disabled={isSubmitting || isResumeAlreadyUploaded}
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {fileError && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {fileError}
        </p>
      )}
      {answers.resumeFile && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-[#edf9f7] px-3 py-2 text-xs text-[#087f87]">
          <span>
            {answers.resumeFile.name} ·{" "}
            {(answers.resumeFile.size / (1024 * 1024)).toFixed(1)} MB
            {isResumeUploaded ? " · Uploaded" : " · Ready to upload"}
          </span>
          {!isResumeUploaded ? (
            <button
              aria-label="Remove selected resume"
              className="font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => onChange("resumeFile", null)}
              type="button"
            >
              Remove
            </button>
          ) : null}
        </div>
      )}
      {!answers.resumeFile && answers.resumeUploadedFileName ? (
        <p className="mt-2 rounded-lg bg-[#edf9f7] px-3 py-2 text-xs text-[#087f87]">
          Saved to your account: {answers.resumeUploadedFileName}. Choose a new file to replace it.
        </p>
      ) : null}
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#effaf8] px-4 py-3 text-xs leading-5 text-[#718082]">
        <span aria-hidden="true" className="text-[#078b8d]">✦</span>
        Skills found in your resume help us improve the quality of your
        recommendations.
      </p>
    </div>
  );
}