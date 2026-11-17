import { useState, type ChangeEvent, type DragEvent } from "react";
import type { OnboardingAnswers } from "@/features/onboarding/store";

type JobStep6Props = {
  answers: OnboardingAnswers;
  onChange: <Key extends keyof OnboardingAnswers>(
    field: Key,
    value: OnboardingAnswers[Key],
  ) => void;
};

const maxResumeSize = 10 * 1024 * 1024;
const allowedExtensions = /\.(pdf|doc|docx)$/i;
const allowedTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export default function JobStep6({ answers, onChange }: JobStep6Props) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function setResume(file: File | undefined) {
    if (!file) return;
    const validType =
      allowedTypes.has(file.type) ||
      (!file.type && allowedExtensions.test(file.name));
    if (!validType || !allowedExtensions.test(file.name)) {
      setFileError("Choose a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > maxResumeSize) {
      setFileError("Your resume must be 10 MB or smaller.");
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
    setResume(event.dataTransfer.files[0]);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#354346]">
        <span>Resume</span>
        <span className="font-normal text-[#9ba6a7]">Optional</span>
      </div>
      <label
        className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-5 text-center transition ${
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
          {answers.resumeFile?.name ?? "Choose a file or drag it here"}
        </span>
        <span className="mt-1 text-xs text-[#8a9899]">
          PDF, DOC, or DOCX up to 10 MB
        </span>
        <input
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          id="job-resume-upload"
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
          </span>
          <button
            aria-label="Remove resume"
            className="font-semibold"
            onClick={() => onChange("resumeFile", null)}
            type="button"
          >
            Remove
          </button>
        </div>
      )}
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#effaf8] px-4 py-3 text-xs leading-5 text-[#718082]">
        <span aria-hidden="true" className="text-[#078b8d]">✦</span>
        Skills found in your resume help us improve the quality of your
        recommendations.
      </p>
    </div>
  );
}