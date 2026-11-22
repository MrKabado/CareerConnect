import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Width utility, e.g. "max-w-md". */
  widthClass?: string;
}

/** Render conditionally from the parent: `{open && <Modal ... />}`. */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  widthClass = "max-w-md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehavior(dialogRef, true, onClose);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-[#263638]/45 p-4 max-[680px]:p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl max-[680px]:max-h-[calc(100dvh-1.5rem)] ${widthClass}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4 max-[680px]:px-5 max-[680px]:pt-5">
          <div>
            <h2 id={titleId} className="text-[22px] font-bold tracking-[-0.4px] text-ink max-[680px]:text-xl">{title}</h2>
            {subtitle && <p className="mt-2 text-sm text-[#718181]">{subtitle}</p>}
          </div>
          <button
            type="button"
            data-dialog-initial
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </div>
  );
}
