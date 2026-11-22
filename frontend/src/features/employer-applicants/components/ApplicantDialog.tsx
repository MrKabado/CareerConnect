import { useId, useRef } from "react";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

type ApplicantDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  role?: "dialog" | "alertdialog";
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export default function ApplicantDialog({ open, title, onClose, children, role = "dialog", error, onRetry, isRetrying = false }: ApplicantDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogBehavior(dialogRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#15292b]/55 p-4 max-[600px]:p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-[#dfe9e7] bg-white p-5 shadow-2xl sm:p-6 max-[600px]:max-h-[calc(100dvh-1.5rem)]"
      >
        <header className="mb-5 flex shrink-0 items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-[#203638]">{title}</h2>
          <button
            type="button"
            data-dialog-initial
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-8 shrink-0 place-items-center rounded-md border border-[#dfe9e7] text-lg text-[#496264] hover:bg-[#f3f8f7]"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          {error ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f1d2d3] bg-[#fff8f8] px-3 py-2.5" role="alert">
              <p className="text-xs text-[#8d393e]">{error}</p>
              {onRetry ? <button type="button" onClick={onRetry} disabled={isRetrying} className="text-xs font-semibold text-[#9b4146] underline underline-offset-2 disabled:opacity-60">Retry</button> : null}
            </div>
          ) : null}
          {children}
        </div>
      </section>
    </div>
  );
}