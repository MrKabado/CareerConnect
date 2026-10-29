import { useRef, type ChangeEvent, type DragEvent } from "react";

export type ApplicationStep = 1 | 2 | 3;

export function ApplicationStepIndicator({
  currentStep,
  track = "Job",
}: {
  currentStep: ApplicationStep;
  track?: "Job" | "OJT";
}) {
  const steps: Array<{ label: string; number: ApplicationStep }> = [
    { label: track === "OJT" ? "Documents" : "Application", number: 1 },
    { label: track === "OJT" ? "OJT review" : "Review", number: 2 },
    { label: "Submitted", number: 3 },
  ];

  return (
    <ol
      aria-label="Application progress"
      className="mx-auto mt-7 grid w-full max-w-[410px] grid-cols-3"
    >
      {steps.map((step, index) => {
        const isComplete = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        return (
          <li
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex flex-col items-center"
            key={step.label}
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-[15px] left-1/2 h-px w-full ${
                  isComplete ? "bg-[#0a9298]" : "bg-[#dce8e7]"
                }`}
              />
            )}
            <span
              className={`relative z-10 grid size-[30px] place-items-center rounded-full border text-[11px] font-semibold ${
                isCurrent || isComplete
                  ? "border-[#0a9096] bg-[#0a9096] text-white"
                  : "border-[#dce7e6] bg-white text-[#9aabad]"
              }`}
            >
              {isComplete ? "✓" : step.number}
            </span>
            <span
              className={`mt-1.5 text-[9px] font-medium ${
                isCurrent ? "text-[#087f84]" : "text-[#849394]"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ApplicationFileUpload({
  label,
  fileName,
  helperText,
  required = false,
  error,
  onSelect,
}: {
  label: string;
  fileName?: string;
  helperText: string;
  required?: boolean;
  error?: string;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onSelect(file);
  }

  function dropFile(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) onSelect(file);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#526365]">
          <span id={`${fieldId}-label`}>
          {label}
          {required && <span className="text-[#d15f56]"> *</span>}
          </span>
        </p>
        {!required && (
          <span className="text-[9px] text-[#98a5a6]">Optional</span>
        )}
      </div>
      <input
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-invalid={Boolean(error)}
        aria-labelledby={`${fieldId}-label`}
        className="sr-only"
        onChange={chooseFile}
        ref={inputRef}
        type="file"
      />
      <button
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`flex min-h-[80px] w-full flex-col items-center justify-center rounded-[10px] border border-dashed px-4 py-3 text-center transition-colors focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${
          error
            ? "border-[#d9847d] bg-[#fff9f8]"
            : "border-[#d7e5e3] bg-[#f3f8f7] hover:border-[#83c9c3] hover:bg-[#eff8f6]"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropFile}
        type="button"
      >
        <span className="grid size-8 place-items-center rounded-[9px] bg-white text-[#0a8c91] shadow-[0_2px_8px_rgba(47,77,76,0.08)]">
          {fileName ? (
            <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
              <path d="M7 3.75h7l4 4V20a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 6 20V4.5a.75.75 0 0 1 .75-.75Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 4v4h4m-8 5h4m-4 3h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
              <path d="M12 16V4m0 0L8 8m4-4 4 4M5 16v3.25c0 .41.34.75.75.75h12.5a.75.75 0 0 0 .75-.75V16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          )}
        </span>
        <span className="mt-2 max-w-full truncate text-[10px] font-semibold text-[#34494b]">
          {fileName || "Choose a file or drag it here"}
        </span>
        <span className="mt-0.5 text-[8px] text-[#8b999a]">
          {fileName ? "Click to replace" : helperText}
        </span>
      </button>
      {error && (
        <p className="mt-1.5 text-[10px] text-[#b34840]" id={`${fieldId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ApplicationReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] bg-[#f2f7f6] px-4 py-3">
      <p className="text-[8px] font-medium uppercase tracking-[0.06em] text-[#91a0a1]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-[11px] font-medium text-[#354749]">
        {value}
      </p>
    </div>
  );
}

export function ApplicationPrimaryButton({
  children,
  disabled = false,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] bg-[#078b98] px-4 text-[11px] font-semibold text-white shadow-[0_4px_10px_rgba(7,139,152,0.19)] transition-colors hover:bg-[#067983] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}
