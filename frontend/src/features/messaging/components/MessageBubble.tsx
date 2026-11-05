import {
  formatCenteredMessageTime,
  formatMessageTimestamp,
} from "@/features/messaging/formatMessageTimestamp";
import type { Message, MessagingActor } from "@/features/messaging/types";

export function MessageBubble({
  message,
  actor,
}: {
  message: Message;
  actor: MessagingActor | null;
}) {
  const isMine =
    message.senderId ===
    (actor?.role === "applicant"
      ? actor.email.trim().toLocaleLowerCase()
      : actor?.id);

  return (
    <div className="space-y-1.5">
      <time className="block text-center text-[11px] text-[#829092]" dateTime={message.createdAt}>
        {formatCenteredMessageTime(message.createdAt)}
      </time>
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <article
          className={`max-w-[82%] rounded-2xl px-4 py-3 ${
            isMine
              ? "rounded-br-md bg-[#078b8d] text-white"
              : "rounded-bl-md border border-[#e8eeee] bg-white text-[#344749]"
          }`}
        >
          {!isMine && (
            <p className="mb-1 text-[11px] font-semibold text-[#078b8d]">
              {message.senderName}
            </p>
          )}
          <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
          {message.attachments?.map((attachment) => (
            <span
              className="mt-2 block rounded-lg bg-black/5 px-2.5 py-2 text-xs"
              key={attachment.id}
            >
              {attachment.name}
            </span>
          ))}
          <time
            className={`mt-1.5 block text-right text-[10px] ${
              isMine ? "text-white/75" : "text-[#829092]"
            }`}
            dateTime={message.createdAt}
          >
            {formatMessageTimestamp(message.createdAt)}
          </time>
        </article>
      </div>
    </div>
  );
}
