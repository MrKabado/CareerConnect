import { cn } from "@/lib/cn";
import { useCompanyVerification } from "@/features/company-verification/useCompanyVerification";
import type { CompanyVerificationStageStatus } from "@/features/company-verification/types";

const statusLabels: Record<CompanyVerificationStageStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  needs_changes: "Needs changes",
  complete: "Complete",
  locked: "Locked",
};

function getStageIcon(status: CompanyVerificationStageStatus) {
  if (status === "complete") {
    return (
      <span aria-hidden="true" className="text-[9px] font-bold">
        ✓
      </span>
    );
  }
  if (status === "locked") {
    return (
      <svg aria-hidden="true" className="size-2.5" fill="none" viewBox="0 0 16 16">
        <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" width="10" x="3" y="7" />
        <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />;
}

function getStatusChipClass(status: CompanyVerificationStageStatus) {
  switch (status) {
    case "complete":
      return "bg-[#def4ee] text-[#228578]";
    case "in_progress":
      return "bg-[#e7f2f7] text-[#3d7188]";
    case "submitted":
      return "bg-[#fff1d9] text-[#997329]";
    case "needs_changes":
      return "bg-[#fde9e8] text-[#b34840]";
    case "locked":
      return "bg-[#f0f3f2] text-[#839090]";
    case "not_started":
      return "bg-[#f3efed] text-[#796c67]";
  }
}

export default function CompanyVerificationCard() {
  const verification = useCompanyVerification();
  const currentIndex = verification.currentStage
    ? verification.stages.findIndex((stage) => stage.id === verification.currentStage?.id)
    : verification.stages.length;

  return (
    <section
      aria-label="Company verification"
      aria-live="polite"
      className="rounded-[20px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_24px_rgba(27,54,52,0.03)] md:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold text-[#1d3034]">Company verification</h2>
        <span className="text-[12px] font-bold text-[#1d3034]">{verification.percent}%</span>
      </div>

      <div className="mb-2 flex justify-between text-[9px] text-[#718082]">
        <span>
          {verification.percent === 100
            ? "All stages complete"
            : `Stage ${Math.min(currentIndex + 1, verification.stages.length)} of ${verification.stages.length}`}
        </span>
      </div>
      <div
        aria-label={`Company verification ${verification.percent}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={verification.percent}
        className="h-2.5 overflow-hidden rounded-full bg-[#edf2f1]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[#0d8fa2] transition-[width]"
          style={{ width: `${verification.percent}%` }}
        />
      </div>

      <ol aria-label="Company verification stages" className="mt-4 space-y-3">
        {verification.stages.map((stage) => {
          const isCurrent = stage.id === verification.currentStage?.id;
          const instructionId = `verification-instruction-${stage.id}`;
          return (
            <li
              aria-describedby={instructionId}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "group relative flex cursor-help items-start gap-2 rounded-md text-[11px] text-[#516d70] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2",
                isCurrent && "-mx-2 bg-[#f3faf9] px-2 py-1.5",
              )}
              key={stage.id}
              tabIndex={0}
            >
              <span
                className="invisible absolute top-full left-0 z-30 mt-1 w-max max-w-[calc(100vw-4rem)] rounded-md border border-[#d7e5e3] bg-[#263a3c] px-2.5 py-2 text-[9px] leading-4 text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
                id={instructionId}
                role="tooltip"
              >
                {stage.status === "locked" ? "Unlocks after approval. " : ""}
                {stage.reason && stage.status === "needs_changes" ? `${stage.reason} ` : ""}
                {stage.hint}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                  stage.status === "complete"
                    ? "bg-[#dff4ef] text-[#1b8d87]"
                    : stage.status === "locked"
                      ? "bg-[#f0f3f2] text-[#839090]"
                      : "border border-[#cbd9d8] text-[#16827e]",
                )}
              >
                {getStageIcon(stage.status)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className={cn(isCurrent && "font-semibold text-[#354749]")}>
                    {stage.label}
                  </span>
                  <span
                    aria-label={stage.status === "locked" ? "Locked. Unlocks after approval." : statusLabels[stage.status]}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[8px] font-semibold",
                      getStatusChipClass(stage.status),
                    )}
                  >
                    {statusLabels[stage.status]}
                  </span>
                </span>
                {stage.status !== "complete" && stage.status !== "locked" ? (
                  <span className="mt-1 block text-[10px] leading-4 text-[#849394]">
                    {stage.reason ?? stage.hint}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}