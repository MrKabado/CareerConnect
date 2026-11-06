import { Skeleton } from "@/components/ui/skeleton";
import { formatMessageTimestamp } from "@/features/messaging/formatMessageTimestamp";
import type { Conversation, MessagingActor } from "@/features/messaging/types";

type ApplicantMessagesSidebarProps = {
  actor: MessagingActor | null;
  conversationId: string | null;
  conversationsError: string | null;
  conversationsLoading: boolean;
  filteredConversations: Conversation[];
  onChooseConversation: (conversation: Conversation) => void;
  search: string;
  onSearchChange: (value: string) => void;
  unreadConversationIds: Set<string>;
};

export function ApplicantMessagesSidebar({
  actor,
  conversationId,
  conversationsError,
  conversationsLoading,
  filteredConversations,
  onChooseConversation,
  search,
  onSearchChange,
  unreadConversationIds,
}: ApplicantMessagesSidebarProps) {
  if (!actor) {
    return null;
  }

  return (
    <aside
      aria-label="Conversation list"
      className={`${conversationId ? "max-[760px]:hidden" : ""} flex min-h-0 flex-col border-r border-[#edf1f1]`}
    >
      <div className="border-b border-[#edf1f1] p-4">
        <label className="sr-only" htmlFor="message-search">
          Search conversations
        </label>
        <input
          autoComplete="off"
          className="w-full rounded-xl border border-[#e2eae9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#344749] outline-none placeholder:text-[#94a1a2] focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
          id="message-search"
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          placeholder="Search conversations"
          type="search"
          value={search}
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {conversationsError && (
          <p className="p-4 text-sm text-[#a2534c]" role="alert">
            {conversationsError}
          </p>
        )}
        {!conversationsError && conversationsLoading && (
          <div className="space-y-3 p-3" aria-busy="true" aria-live="polite">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-18 w-full rounded-xl" />
            ))}
          </div>
        )}
        {!conversationsError && !conversationsLoading && filteredConversations.length === 0 && (
          <div className="px-5 py-10 text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid size-12 place-items-center rounded-full bg-[#e8f4f1] text-xl text-[#078b8d]"
            >
              ✉
            </span>
            <p className="mt-3 text-sm font-semibold text-[#344749]">No messages yet</p>
            <p className="mt-1 text-xs leading-5 text-[#829092]">
              Employers who review your application will contact you here.
            </p>
          </div>
        )}
        {filteredConversations.map((conversation) => (
          <li key={conversation.conversationId}>
            <button
              aria-current={conversationId === conversation.conversationId ? "true" : undefined}
              className={`flex w-full items-start gap-3 border-b border-[#f0f3f3] px-4 py-4 text-left transition hover:bg-[#f7fbfa] focus-visible:z-10 focus-visible:outline-[3px] focus-visible:outline-inset focus-visible:outline-[#67c9c1] ${conversationId === conversation.conversationId ? "bg-[#f0f8f6]" : ""}`}
              onClick={() => onChooseConversation(conversation)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6f4f0] text-sm font-bold text-[#087879]"
              >
                {conversation.companyInitial ||
                  conversation.companyName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#344749]">
                    {conversation.companyName}
                  </span>
                  <time
                    className="shrink-0 text-[10px] text-[#829092]"
                    dateTime={conversation.lastMessageAt}
                  >
                    {formatMessageTimestamp(conversation.lastMessageAt)}
                  </time>
                  {unreadConversationIds.has(conversation.conversationId) && (
                    <span
                      aria-label="Unread"
                      className="size-2 shrink-0 rounded-full bg-[#078b8d]"
                    />
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[#687b7e]">
                  {conversation.role}
                </span>
                <span className="mt-1 block truncate text-xs text-[#829092]">
                  {conversation.lastMessagePreview}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
