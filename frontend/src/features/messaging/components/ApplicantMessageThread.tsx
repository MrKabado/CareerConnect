import type { FormEvent, RefObject } from "react";
import { MessageBubble } from "@/features/messaging/components/MessageBubble";
import type { Conversation, Message, MessagingActor } from "@/features/messaging/types";

type ApplicantMessageThreadProps = {
  actor: MessagingActor | null;
  announcement: string;
  conversation: Conversation | null;
  error: string | null;
  loading: boolean;
  messageEndRef: RefObject<HTMLDivElement | null>;
  messageText: string;
  messages: Message[];
  onBack: () => void;
  onMessageTextChange: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  sendError: string | null;
  sending: boolean;
};

export function ApplicantMessageThread({
  actor,
  announcement,
  conversation,
  error,
  loading,
  messageEndRef,
  messageText,
  messages,
  onBack,
  onMessageTextChange,
  onSend,
  sendError,
  sending,
}: ApplicantMessageThreadProps) {
  if (!conversation) {
    return (
      <div className="grid min-h-0 place-items-center px-6 py-12 text-center max-[760px]:hidden">
        <div>
          <span
            aria-hidden="true"
            className="mx-auto grid size-14 place-items-center rounded-full bg-[#e8f4f1] text-2xl text-[#078b8d]"
          >
            ✉
          </span>
          <p className="mt-4 text-sm font-semibold text-[#344749]">Select a conversation</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[#829092]">
            Choose a conversation to view messages and reply.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label={`Conversation with ${conversation.companyName}`} className="flex min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-[#edf1f1] px-5 py-4">
        <button
          aria-label="Back to conversations"
          className="hidden rounded-lg p-2 text-[#687b7e] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] max-[760px]:inline-flex"
          onClick={onBack}
          type="button"
        >
          ←
        </button>
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6f4f0] text-sm font-bold text-[#087879]"
        >
          {conversation.companyInitial || conversation.companyName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-[#263a3c]">
            {conversation.role} · {conversation.companyName}
          </h2>
          {conversation.employerVerified && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#e7f5f1] px-2 py-0.5 text-[10px] font-semibold text-[#087879]">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.2 9.7 2l1.9-.1.9 1.6 1.6.9-.1 1.9.8 1.7-.8 1.7.1 1.9-1.6.9-.9 1.6-1.9-.1-1.7.8-1.7-.8-1.9.1-.9-1.6-1.6-.9.1-1.9L1.2 8l.8-1.7-.1-1.9 1.6-.9.9-1.6 1.9.1L8 1.2Zm-1 9.4 4-4-.9-.9L7 8.8 5.9 7.7l-.9.9L7 10.6Z" />
              </svg>
              Verified employer
            </span>
          )}
        </div>
      </header>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfdfc] px-5 py-5">
        {error && (
          <p className="rounded-lg bg-[#fff4f2] p-3 text-sm text-[#a2534c]" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="text-center text-xs text-[#829092]">Loading messages…</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="text-center text-xs text-[#829092]">
            No messages in this conversation yet.
          </p>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} actor={actor} />
        ))}
        {sendError && (
          <p className="text-sm text-[#a2534c]" role="alert">
            {sendError}
          </p>
        )}
        <div ref={messageEndRef} />
      </div>

      {conversation.status === "closed" ? (
        <p className="border-t border-[#edf1f1] bg-[#f7f9f8] px-5 py-4 text-center text-xs text-[#687b7e]">
          This conversation is closed and read-only. You can no longer send messages.
        </p>
      ) : (
        <form className="border-t border-[#edf1f1] p-4" onSubmit={onSend}>
          <label className="sr-only" htmlFor="message-reply">
            Write a reply
          </label>
          <div className="flex items-end gap-3">
            <textarea
              className="min-h-11 max-h-36 flex-1 resize-y rounded-xl border border-[#e2eae9] bg-white px-3 py-2.5 text-sm text-[#344749] outline-none placeholder:text-[#94a1a2] focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
              id="message-reply"
              onChange={(event) => onMessageTextChange(event.currentTarget.value)}
              placeholder="Write a reply…"
              value={messageText}
            />
            <button
              className="rounded-xl bg-[#078b8d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#066f72] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
              disabled={sending || !messageText.trim()}
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

