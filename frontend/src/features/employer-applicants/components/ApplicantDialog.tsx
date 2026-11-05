import { useEffect, useEffectEvent, useId, useRef } from "react";

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
  const closeDialog = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";
    const initialFocus = dialog?.querySelector<HTMLElement>("[data-dialog-initial]")
      ?? dialog?.querySelector<HTMLElement>(focusableSelector);
    initialFocus?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#15292b]/55 p-4"
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
        className="max-h-[92vh] w-full max-w-130 overflow-y-auto rounded-xl border border-[#dfe9e7] bg-white p-5 shadow-2xl sm:p-6"
      >
        <header className="mb-5 flex items-start justify-between gap-4">
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
        {error ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f1d2d3] bg-[#fff8f8] px-3 py-2.5" role="alert">
            <p className="text-xs text-[#8d393e]">{error}</p>
            {onRetry ? <button type="button" onClick={onRetry} disabled={isRetrying} className="text-xs font-semibold text-[#9b4146] underline underline-offset-2 disabled:opacity-60">Retry</button> : null}
          </div>
        ) : null}
        {children}
      </section>
    </div>
  );
}