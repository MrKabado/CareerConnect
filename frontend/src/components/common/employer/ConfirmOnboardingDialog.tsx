import { useEffect, useRef } from "react";
import type { DefaultsSnapshot } from "@/features/employer-listings/types";
import { cn } from "@/lib/cn";

type ConfirmOnboardingDialogProps = {
  open: boolean;
  defaults: DefaultsSnapshot | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmOnboardingDialog({
  open,
  defaults,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ConfirmOnboardingDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      initialFocusRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21363a]/45 px-4 backdrop-blur-[1px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-onboarding-title"
        className="w-full max-w-[480px] rounded-[18px] border border-[#dfeae8] bg-[#f4f8f8] p-5 shadow-[0_30px_80px_rgba(24,48,51,0.22)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0d8fa2]">
              Listing setup
            </p>
            <h2 id="confirm-onboarding-title" className="mt-2 text-[18px] font-bold tracking-[-0.05em] text-[#1d3133]">
              Confirm onboarding defaults
            </h2>
          </div>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-[#4b6669] transition hover:bg-white"
            aria-label="Close onboarding confirmation dialog"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-[14px] border border-[#dfeae8] bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5d7071]">
            Defaults to confirm
          </p>

          <ul className="mt-3 space-y-2 text-[11px] text-[#435c5f]">
            <li className="flex items-center justify-between gap-3">
              <span>Hiring for</span>
              <span className="font-semibold text-[#1d3133]">{defaults?.hiringFor ?? "Job"}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Default workspace</span>
              <span className="font-semibold text-[#1d3133]">{defaults?.defaultWorkspace ?? "BGC, Taguig City"}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>School partnerships</span>
              <span className="font-semibold text-[#1d3133]">{defaults?.schoolPartnerships ?? "Open"}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Accepted courses</span>
              <span className="font-semibold text-[#1d3133]">
                {defaults?.acceptedCourses?.length ? defaults.acceptedCourses.join(", ") : "Not specified"}
              </span>
            </li>
          </ul>
        </div>

        {error ? (
          <p role="alert" aria-live="assertive" className="mt-3 rounded-xl border border-[#f0d0d0] bg-[#fff1f1] px-3 py-2 text-[11px] text-[#914a4a]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#dfe8e7] bg-white px-3 py-2 text-[11px] font-semibold text-[#4a6467] transition hover:border-[#d0e2e0]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={cn(
              "rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition",
              isSubmitting && "cursor-not-allowed opacity-70",
            )}
          >
            {isSubmitting ? "Confirming..." : "Confirm defaults"}
          </button>
        </div>
      </div>
    </div>
  );
}
