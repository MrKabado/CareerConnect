import type { FormEvent } from "react";
import { formatCenteredMessageTime, formatMessageTimestamp } from "@/features/messaging/formatMessageTimestamp";
import type { Conversation, Message, MessagingActor } from "@/features/messaging/types";

type EmployerMessageThreadProps = {
  actor: MessagingActor | null;
  conversation: Conversation | null;
  error: string | null;
  loading: boolean;
  messages: Message[];
  onBack: () => void;
  onBodyChange: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  sendError: string | null;
  sending: boolean;
  body: string;
};

export function EmployerMessageThread({
  actor,
  conversation,
  error,
  loading,
  messages,
  onBack,
  onBodyChange,
  onSend,
  sendError,
  sending,
  body,
}: EmployerMessageThreadProps) {
  if (!conversation) {
    return (
      <div className="grid min-h-0 place-items-center px-6 py-12 text-center max-[760px]:hidden">
        <div>
          <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-[#e8f4f1] text-2xl text-[#078b8d]">✉</span>
          <p className="mt-4 text-sm font-semibold text-[#344749]">Select a conversation</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[#829092]">Choose an applicant conversation to read and reply.</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label={`Conversation with ${conversation.applicantName}`} className="flex min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-[#edf1f1] px-5 py-4">
        <button
          aria-label="Back to conversations"
          className="hidden rounded-lg p-2 text-[#687b7e] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] max-[760px]:inline-flex"
          onClick={onBack}
          type="button"
        >
          ←
        </button>
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6f4f0] text-sm font-bold text-[#087879]">
          {conversation.applicantName
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-[#263a3c]">{conversation.role} · {conversation.companyName}</h2>
          <p className="mt-0.5 truncate text-xs text-[#687b7e]">Conversation with {conversation.applicantName}</p>
          {conversation.employerVerified && (
            <span className="mt-1 inline-flex rounded-full bg-[#e7f5f1] px-2 py-0.5 text-[10px] font-semibold text-[#087879]">
              Verified employer
            </span>
          )}
        </div>
      </header>
      <div aria-live="polite" className="sr-only">
        {messages.length ? `${messages.length} messages in conversation` : ""}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfdfc] px-5 py-5">
        {error && <p className="rounded-lg bg-[#fff4f2] p-3 text-sm text-[#a2534c]" role="alert">{error}</p>}
        {loading && <p className="text-center text-xs text-[#829092]">Loading messages…</p>}
        {!loading && !error &&
          messages.map((message) => (
            <div className="space-y-1.5" key={message.id}>
              <time className="block text-center text-[11px] text-[#829092]" dateTime={message.createdAt}>
                {formatCenteredMessageTime(message.createdAt)}
              </time>
              <div className={`flex ${message.senderId === actor?.id ? "justify-end" : "justify-start"}`}>
                <article
                  className={`max-w-[82%] rounded-2xl px-4 py-3 ${message.senderId === actor?.id ? "rounded-br-md bg-[#078b8d] text-white" : "rounded-bl-md border border-[#e8eeee] bg-white text-[#344749]"}`}
                >
                  {message.senderId !== actor?.id && (
                    <p className="mb-1 text-[11px] font-semibold text-[#078b8d]">{message.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                  <time
                    className={`mt-1.5 block text-right text-[10px] ${message.senderId === actor?.id ? "text-white/75" : "text-[#829092]"}`}
                    dateTime={message.createdAt}
                  >
                    {formatMessageTimestamp(message.createdAt)}
                  </time>
                </article>
              </div>
            </div>
          ))}
        {sendError && <p className="text-sm text-[#a2534c]" role="alert">{sendError}</p>}
      </div>
      {conversation.status === "closed" ? (
        <p className="border-t border-[#edf1f1] bg-[#f7f9f8] px-5 py-4 text-center text-xs text-[#687b7e]">
          This conversation is closed and read-only.
        </p>
      ) : (
        <form className="border-t border-[#edf1f1] p-4" onSubmit={onSend}>
          <label className="sr-only" htmlFor="employer-message-reply">Write a reply</label>
          <div className="flex items-end gap-3">
            <textarea
              className="min-h-11 max-h-36 flex-1 resize-y rounded-xl border border-[#e2eae9] bg-white px-3 py-2.5 text-sm text-[#344749] outline-none placeholder:text-[#94a1a2] focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
              id="employer-message-reply"
              onChange={(event) => onBodyChange(event.currentTarget.value)}
              placeholder="Write a reply…"
              value={body}
            />
            <button
              className="rounded-xl bg-[#078b8d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#066f72] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
              disabled={sending || !body.trim()}
              type="submit"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
