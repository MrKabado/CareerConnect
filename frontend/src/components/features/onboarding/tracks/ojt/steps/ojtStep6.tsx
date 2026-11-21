import { useState } from "react";
import type { ChangeEvent } from "react";
import type { OjtStepProps } from "./ojtStepTypes";

const maxResumeSize = 5 * 1024 * 1024;
const allowedResumeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const allowedResumeExtensions = /\.(pdf|docx)$/i;

export default function OjtStep6({
  answers,
  isSubmitting = false,
  isResumeUploaded = false,
  onChange,
}: OjtStepProps) {
  const [fileError, setFileError] = useState<string | null>(null);

  function selectResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validType =
      allowedResumeTypes.has(file.type) ||
      (!file.type && allowedResumeExtensions.test(file.name));
    if (!validType || !allowedResumeExtensions.test(file.name)) {
      setFileError("Choose a PDF or DOCX file.");
      event.target.value = "";
      return;
    }
    if (file.size > maxResumeSize) {
      setFileError("Your resume must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFileError(null);
    onChange("resumeFile", file);
    onChange("resumeSkipped", false);
    event.target.value = "";
  }

  return (
    <div>
      <label
        className={`flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbdede] bg-[#fbfdfd] px-5 text-center transition hover:border-[#078b8d] hover:bg-[#f5fbfa] ${
          isSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
        htmlFor="ojt-resume-upload"
      >
        <span className="mb-3 grid size-12 place-items-center rounded-full bg-[#e6f7f4] text-[#078b8d]">
          <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
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
          {answers.resumeFile?.name ?? "Choose a resume to upload"}
        </span>
        <span className="mt-2 text-xs text-[#718082]">
          PDF or DOCX · 5 MB max
        </span>
        <input
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          id="ojt-resume-upload"
          disabled={isSubmitting}
          onChange={selectResume}
          type="file"
        />
      </label>

      {fileError && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {fileError}
        </p>
      )}
      {answers.resumeFile && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-[#edf9f7] px-3 py-2 text-xs text-[#087f87]">
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
        <p className="mt-3 rounded-lg bg-[#edf9f7] px-3 py-2 text-xs text-[#087f87]">
          Saved to your account: {answers.resumeUploadedFileName}. Choose a new file to replace it.
        </p>
      ) : null}
      <p className="mt-4 text-center text-xs leading-5 text-[#718082]">
        Your resume is optional. You can add or update it later from your
        profile.
      </p>
    </div>
  );
}