import { useEffect, useRef, useState } from "react";
import ApplicantDialog from "@/features/employer-applicants/components/ApplicantDialog";
import ApplicantStatusIcon from "@/features/employer-applicants/components/ApplicantStatusIcon";
import ExtendOfferDialog from "@/features/employer-applicants/components/ExtendOfferDialog";
import NextActionButton from "@/features/employer-applicants/components/NextActionButton";
import RejectDialog from "@/features/employer-applicants/components/RejectDialog";
import ScheduleInterviewDialog from "@/features/employer-applicants/components/ScheduleInterviewDialog";
import StatusTimeline from "@/features/employer-applicants/components/StatusTimeline";
import { applicantStatusConfig, forwardApplicantStatuses } from "@/features/employer-applicants/statuses";
import type { ApplicantStatus } from "@/features/employer-applicants/statuses";
import type { ApplicantStatusHistoryEntry, ApplicantStatusUpdatePayload, InterviewDetails, OfferDetails } from "@/features/employer-applicants/types";
import { cn } from "@/lib/cn";

type ApplicantStageStepperProps = {
  status: ApplicantStatus;
  history: ApplicantStatusHistoryEntry[];
  isSaving: boolean;
  error: string | null;
  hiredAt?: string;
  rejectionReason?: string;
  interviewDetails?: InterviewDetails;
  offerDetails?: OfferDetails;
  onAdvance: (payload?: ApplicantStatusUpdatePayload) => Promise<boolean>;
  onReject: (payload?: ApplicantStatusUpdatePayload) => Promise<boolean>;
  onUndoReject: (status: ApplicantStatus) => Promise<boolean>;
  onRetry: () => Promise<boolean>;
};

type RejectionUndoState = {
  previousStatus: ApplicantStatus;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export default function ApplicantStageStepper({
  status,
  history,
  isSaving,
  error,
  hiredAt,
  rejectionReason,
  interviewDetails,
  offerDetails,
  onAdvance,
  onReject,
  onUndoReject,
  onRetry,
}: ApplicantStageStepperProps) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isHiredConfirmOpen, setIsHiredConfirmOpen] = useState(false);
  const [undoState, setUndoState] = useState<RejectionUndoState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const undoTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
  }, []);

  const currentStep = forwardApplicantStatuses.findIndex((step) => step.id === status);
  const progressIndex = status === "rejected" ? -1 : currentStep;

  async function handleNextAction() {
    if (status === "shortlisted") {
      setIsScheduleOpen(true);
      return;
    }
    if (status === "interview_scheduled") {
      setIsOfferOpen(true);
      return;
    }
    if (status === "offer_extended") {
      setIsHiredConfirmOpen(true);
      return;
    }
    const advanced = await onAdvance();
    if (advanced) setAnnouncement(`Moved to ${applicantStatusConfig[applicantStatusConfig[status].nextStage!].label}.`);
  }

  async function handleScheduleInterview(details: InterviewDetails) {
    const advanced = await onAdvance({ interviewDetails: details, ...(details.message ? { note: details.message } : {}) });
    if (advanced) setAnnouncement("Interview scheduled.");
    return advanced;
  }

  async function handleExtendOffer(details: OfferDetails) {
    const advanced = await onAdvance({ offerDetails: details, ...(details.notes ? { note: details.notes } : {}) });
    if (advanced) setAnnouncement("Offer extended.");
    return advanced;
  }

  async function handleReject(payload: ApplicantStatusUpdatePayload) {
    const previousStatus = status;
    const rejected = await onReject(payload);
    if (!rejected) return false;

    setIsRejectOpen(false);
    setUndoState({ previousStatus });
    setAnnouncement("Applicant moved to Rejected. Undo is available for 8 seconds.");
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), 8000);
    return true;
  }

  async function handleUndoReject() {
    if (!undoState) return;
    const restored = await onUndoReject(undoState.previousStatus);
    if (restored) {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
      setUndoState(null);
      setAnnouncement(`Applicant restored to ${applicantStatusConfig[undoState.previousStatus].label}.`);
    }
  }

  async function handleMarkHired() {
    const hired = await onAdvance({ hiredAt: new Date().toISOString() });
    if (hired) {
      setIsHiredConfirmOpen(false);
      setAnnouncement("Applicant marked as hired.");
    }
  }

  async function handleRetry() {
    const previousStatus = status;
    const wasRejecting = isRejectOpen;
    const hadUndoToast = undoState !== null;
    const retried = await onRetry();
    if (retried) {
      setIsScheduleOpen(false);
      setIsOfferOpen(false);
      setIsRejectOpen(false);
      setIsHiredConfirmOpen(false);
      setAnnouncement("Stage update saved.");
      if (wasRejecting) {
        setUndoState({ previousStatus });
        if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = window.setTimeout(() => setUndoState(null), 8000);
      } else if (hadUndoToast) {
        setUndoState(null);
        if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
      }
    }
  }

  const hiredDate = hiredAt ?? history.find((entry) => entry.to === "hired")?.changedAt;

  return (
    <section aria-label="Application stage" className="mb-6 rounded-[22px] border border-[#e1ebea] bg-white py-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#647778]">Hiring progress</p>
          <p className="mt-1 text-sm font-semibold text-[#203638]">{applicantStatusConfig[status].label}</p>
        </div>
        {status !== "hired" && status !== "rejected" ? <ApplicantStatusIcon name={applicantStatusConfig[status].icon} className="size-5 text-[#167d85]" /> : null}
      </div>

      {status === "rejected" ? (
        <div className="mx-4 mt-4 flex flex-wrap items-start gap-3 rounded-lg border border-[#f1d2d3] bg-[#fff8f8] p-4 sm:mx-5">
          <ApplicantStatusIcon name="x" className="mt-0.5 size-5 shrink-0 text-[#b85054]" />
          <div>
            <h2 className="text-sm font-semibold text-[#8d393e]">Rejected</h2>
            <p className="mt-1 text-sm text-[#765456]">{rejectionReason?.trim() || "No reason was added."}</p>
          </div>
        </div>
      ) : status === "hired" ? (
        <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#d1eadf] bg-[#f3faf6] p-4 sm:mx-5">
          <ApplicantStatusIcon name="check" className="size-5 shrink-0 text-[#187850]" />
          <div>
            <h2 className="text-sm font-semibold text-[#187850]">Hired</h2>
            <p className="mt-1 text-xs text-[#58786b]">{hiredDate ? `Hired on ${formatDate(hiredDate)}` : "Final hiring stage"}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 hidden px-4 sm:block sm:px-5">
            <ol aria-label="Applicant progress" className="grid grid-cols-6">
              {forwardApplicantStatuses.map((step, index) => {
                const completed = index < progressIndex;
                const current = step.id === status;
                return (
                  <li key={step.id} aria-current={current ? "step" : undefined} className="relative min-w-0 text-center">
                    {index > 0 ? <span className={cn("absolute left-[-50%] top-4 h-px w-full", completed || current ? "bg-[#5aabaa]" : "bg-[#dce7e5]")} aria-hidden="true" /> : null}
                    <span className={cn(
                      "relative mx-auto grid size-8 place-items-center rounded-full border",
                      completed ? "border-[#218c89] bg-[#218c89] text-white" : "",
                      current ? "border-[#0e8e9b] bg-[#e8f6f5] text-[#0e7e87] ring-4 ring-[#e8f6f5]" : "",
                      !completed && !current ? "border-[#dce7e5] bg-white text-[#91a2a2]" : "",
                    )}>
                      {completed ? <ApplicantStatusIcon name="check" /> : <ApplicantStatusIcon name={applicantStatusConfig[step.id].icon} className="size-4" />}
                    </span>
                    <span className={cn("mt-2 block px-1 text-[10px] leading-4", current ? "font-semibold text-[#176d73]" : completed ? "font-medium text-[#496264]" : "text-[#849394]")}>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="mt-4 px-4 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#176d73]">{applicantStatusConfig[status].label}</span>
              <span className="text-xs text-[#718586]">Step {currentStep + 1} of {forwardApplicantStatuses.length}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5efee]">
              <span className="block h-full rounded-full bg-[#148c91] transition-all" style={{ width: `${((currentStep + 1) / forwardApplicantStatuses.length) * 100}%` }} />
            </div>
          </div>
        </>
      )}

      {status === "interview_scheduled" && interviewDetails ? (
        <dl className="mx-4 mt-4 grid gap-2 rounded-lg border border-[#e1ebea] bg-[#f7fbfa] p-4 text-xs sm:mx-5 sm:grid-cols-2">
          <div><dt className="text-[#718586]">Interview</dt><dd className="mt-1 font-medium text-[#31494b]">{interviewDetails.date} · {interviewDetails.time} {interviewDetails.timezone}</dd></div>
          <div><dt className="text-[#718586]">Format</dt><dd className="mt-1 font-medium text-[#31494b]">{interviewDetails.format === "online" ? "Online" : "On-site"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[#718586]">{interviewDetails.format === "online" ? "Meeting link" : "Address"}</dt><dd className="mt-1 break-all font-medium text-[#31494b]">{interviewDetails.locationOrLink}</dd></div>
          {interviewDetails.message ? <div className="sm:col-span-2"><dt className="text-[#718586]">Message</dt><dd className="mt-1 text-[#31494b]">{interviewDetails.message}</dd></div> : null}
        </dl>
      ) : null}
      {status === "offer_extended" && offerDetails ? (
        <dl className="mx-4 mt-4 rounded-lg border border-[#e1ebea] bg-[#f7fbfa] p-4 text-xs sm:mx-5">
          <dt className="text-[#718586]">Proposed start date</dt>
          <dd className="mt-1 font-medium text-[#31494b]">{formatDate(offerDetails.startDate)}</dd>
          {offerDetails.notes ? <><dt className="mt-3 text-[#718586]">Notes</dt><dd className="mt-1 text-[#31494b]">{offerDetails.notes}</dd></> : null}
        </dl>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 px-4 sm:px-5">
        <NextActionButton status={status} disabled={isSaving} onClick={() => void handleNextAction()} />
        {status !== "hired" && status !== "rejected" ? (
          <button type="button" onClick={() => setIsRejectOpen(true)} disabled={isSaving} className="min-h-10 rounded-lg border border-[#cf7779] bg-white px-4 py-2 text-sm font-semibold text-[#a7464b] hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-60">Reject</button>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f1d2d3] bg-[#fff8f8] px-3 py-2.5 sm:mx-5" role="alert">
          <p className="text-xs text-[#8d393e]">{error}</p>
          <button type="button" onClick={() => void handleRetry()} disabled={isSaving} className="text-xs font-semibold text-[#9b4146] underline underline-offset-2 disabled:opacity-60">Retry</button>
        </div>
      ) : null}

      {undoState ? (
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#203638] px-4 py-3 text-white sm:mx-5" role="status" aria-live="polite">
          <p className="text-sm">Applicant rejected.</p>
          <button type="button" onClick={() => void handleUndoReject()} disabled={isSaving} className="rounded-md px-2 py-1 text-sm font-semibold underline underline-offset-2 disabled:opacity-60">Undo</button>
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      <div className="mt-5 px-4 sm:px-5"><StatusTimeline history={history} /></div>

      <ScheduleInterviewDialog open={isScheduleOpen} isSubmitting={isSaving} error={error} onRetry={() => void handleRetry()} onClose={() => !isSaving && setIsScheduleOpen(false)} onSubmit={handleScheduleInterview} />
      <ExtendOfferDialog open={isOfferOpen} isSubmitting={isSaving} error={error} onRetry={() => void handleRetry()} onClose={() => !isSaving && setIsOfferOpen(false)} onSubmit={handleExtendOffer} />
      <RejectDialog open={isRejectOpen} isSubmitting={isSaving} error={error} onRetry={() => void handleRetry()} onClose={() => !isSaving && setIsRejectOpen(false)} onSubmit={handleReject} />

      <ApplicantDialog open={isHiredConfirmOpen} title="Mark applicant as hired?" role="alertdialog" error={error} onRetry={() => void handleRetry()} isRetrying={isSaving} onClose={() => !isSaving && setIsHiredConfirmOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#5b7072]">This marks the applicant as hired and completes their application process.</p>
          <p className="rounded-md bg-[#f1f8f7] px-3 py-2 text-xs text-[#507174]">Applicant will be notified about this update.</p>
          <div className="flex justify-end gap-2 border-t border-[#e7efee] pt-4">
            <button type="button" onClick={() => setIsHiredConfirmOpen(false)} disabled={isSaving} className="rounded-lg border border-[#dfe8e7] px-3 py-2 text-sm font-medium text-[#4a6467] disabled:opacity-60">Cancel</button>
            <button type="button" data-dialog-initial onClick={() => void handleMarkHired()} disabled={isSaving} className="rounded-lg bg-[#0e8e9b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Updating..." : "Confirm hired"}</button>
          </div>
        </div>
      </ApplicantDialog>
    </section>
  );
}
