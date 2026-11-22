import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendApplicantNote } from "@/features/messaging/api";

const templates = [
  {
    label: "Invite to interview",
    body: "Hi {name},\n\nWe reviewed your application for {role} at {company} and would like to invite you to an interview. Please reply with a few times that work for you.",
  },
  {
    label: "Request more info",
    body: "Hi {name},\n\nThanks for applying for {role} at {company}. Could you share a little more about your relevant experience?",
  },
  {
    label: "Offer discussion",
    body: "Hi {name},\n\nWe’d like to discuss next steps for your {role} application at {company}. Please let us know when you’re available to talk.",
  },
] as const;

type ContactApplicantDialogProps = {
  token: string;
  applicantName: string;
  applicationId: string | number;
  role: string;
  company: string;
  onClose: () => void;
};

export default function ContactApplicantDialog({
  token,
  applicantName,
  applicationId,
  role,
  company,
  onClose,
}: ContactApplicantDialogProps) {
  const [body, setBody] = useState("");
  const [templateLabel, setTemplateLabel] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const firstFocusRef = useRef<HTMLSelectElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => firstFocusRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !sendingRef.current) {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      );
      if (!focusable?.length) return;
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
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  function applyTemplate(label: string) {
    setTemplateLabel(label);
    const template = templates.find((item) => item.label === label);
    if (!template) return;
    setBody(template.body
      .replaceAll("{name}", applicantName.split(/\s+/)[0] || applicantName)
      .replaceAll("{role}", role)
      .replaceAll("{company}", company));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    sendingRef.current = true;
    setError(null);
    setSuccess(false);
    try {
      await sendApplicantNote(token, applicationId, body.trim());
      setSuccess(true);
      window.setTimeout(onClose, 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The conversation could not be started.");
      setSending(false);
      sendingRef.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#162b2b]/55 p-4 max-[600px]:p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !sending) onClose();
      }}
    >
      <section
        aria-labelledby="contact-applicant-title"
        aria-modal="true"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] max-[600px]:max-h-[calc(100dvh-1.5rem)]"
        ref={dialogRef}
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#edf1f1] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#078b8d]">Applicant note</p>
            <h2 className="mt-1 text-lg font-bold text-[#263a3c]" id="contact-applicant-title">
                Send Note to Applicant
            </h2>
            <p className="mt-1 text-sm text-[#687b7e]">{role} · {company}</p>
          </div>
          <button
            aria-label="Close message composer"
            className="grid size-9 shrink-0 place-items-center rounded-full text-xl text-[#687b7e] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
            disabled={sending}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <form className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-6 [-webkit-overflow-scrolling:touch]" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#526365]" htmlFor="contact-template">
              Start with a template <span className="font-normal text-[#829092]">(optional)</span>
            </label>
            <select
              className="w-full rounded-xl border border-[#dfe8e7] bg-white px-3 py-2.5 text-sm text-[#344749] outline-none focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
              id="contact-template"
              onChange={(event) => applyTemplate(event.currentTarget.value)}
              ref={firstFocusRef}
              value={templateLabel}
            >
              <option value="">Choose a message template</option>
              {templates.map((template) => <option key={template.label} value={template.label}>{template.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#526365]" htmlFor="contact-first-message">
              Note
            </label>
            <textarea
              autoComplete="off"
              className="min-h-36 w-full resize-y rounded-xl border border-[#dfe8e7] px-3 py-3 text-sm leading-6 text-[#344749] outline-none placeholder:text-[#94a1a2] focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
              id="contact-first-message"
              onChange={(event) => setBody(event.currentTarget.value)}
              placeholder={`Write a note to ${applicantName.split(/\s+/)[0] || applicantName}…`}
              required
              value={body}
            />
            <p className="mt-1.5 text-xs text-[#829092]">
              This note will be emailed to the applicant and saved in the messaging conversation.
            </p>
          </div>
          {error && <p className="rounded-lg bg-[#fff4f2] px-3 py-2.5 text-sm text-[#a2534c]" role="alert">{error}</p>}
          {success && <p className="rounded-lg bg-[#edf7f3] px-3 py-2.5 text-sm font-semibold text-[#287862]" role="status">Note sent successfully to the applicant.</p>}
          <div className="flex justify-end gap-3 border-t border-[#edf1f1] pt-4">
            <button
              className="rounded-xl border border-[#dfe8e7] px-4 py-2.5 text-sm font-semibold text-[#526365] hover:bg-[#f7fbfa] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
              disabled={sending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-[#078b8d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#066f72] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
              disabled={sending || !body.trim()}
              type="submit"
            >
              {sending ? "Sending note…" : "Send Note"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
