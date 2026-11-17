import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#263638]/45 p-3 max-[680px]:items-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full rounded-[18px] bg-white shadow-2xl max-[680px]:rounded-b-none ${widthClass}`}
      >
        <div className="flex items-start justify-between gap-4 px-10 pt-9 pb-4">
          <div>
            <h2 className="text-[26px] font-bold tracking-[-0.4px] text-ink">{title}</h2>
            {subtitle && <p className="mt-3 text-[16px] text-[#718181]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
