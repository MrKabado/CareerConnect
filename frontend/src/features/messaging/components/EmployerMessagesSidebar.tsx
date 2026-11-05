import { formatMessageTimestamp } from "@/features/messaging/formatMessageTimestamp";
import type { Conversation } from "@/features/messaging/types";
import type { ConversationFilter } from "@/features/messaging/hooks/useEmployerMessagesPage";

type EmployerMessagesSidebarProps = {
  conversationId: string | null;
  conversations: Conversation[];
  totalConversations: number;
  conversationsError: string | null;
  filter: ConversationFilter;
  filters: ReadonlyArray<readonly [ConversationFilter, string]>;
  listingId: string;
  listingOptions: Conversation[];
  loading: boolean;
  onConversationSelect: (conversation: Conversation) => void;
  onFilterChange: (value: ConversationFilter) => void;
  onListingChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  search: string;
  unreadIds: Set<string>;
};

export function EmployerMessagesSidebar({
  conversationId,
  conversations,
  totalConversations,
  conversationsError,
  filter,
  filters,
  listingId,
  listingOptions,
  loading,
  onConversationSelect,
  onFilterChange,
  onListingChange,
  onSearchChange,
  search,
  unreadIds,
}: EmployerMessagesSidebarProps) {
  return (
    <aside aria-label="Applicant conversations" className={`${conversationId ? "max-[760px]:hidden" : ""} flex min-h-0 flex-col border-r border-[#edf1f1]`}>
      <div className="space-y-3 border-b border-[#edf1f1] p-4">
        <label className="sr-only" htmlFor="employer-message-search">Search conversations</label>
        <input
          className="w-full rounded-xl border border-[#e2eae9] bg-[#f8fbfa] px-3 py-2.5 text-sm text-[#344749] outline-none placeholder:text-[#94a1a2] focus:border-[#078b8d] focus:ring-2 focus:ring-[#078b8d]/15"
          id="employer-message-search"
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          placeholder="Search applicants"
          type="search"
          value={search}
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Conversation filters">
          {filters.map(([value, label]) => (
            <button
              aria-pressed={filter === value}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] ${filter === value ? "bg-[#e6f4f0] text-[#087879]" : "bg-[#f4f7f6] text-[#687b7e] hover:bg-[#eaf1ef]"}`}
              key={value}
              onClick={() => onFilterChange(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {filter === "listing" && (
          <label className="block">
            <span className="sr-only">Select listing</span>
            <select
              className="w-full rounded-lg border border-[#e2eae9] bg-white px-3 py-2 text-xs text-[#526365] outline-none focus:border-[#078b8d]"
              onChange={(event) => onListingChange(event.currentTarget.value)}
              value={listingId}
            >
              <option value="">All listings</option>
              {listingOptions.map((conversation) => (
                <option key={conversation.listingId} value={conversation.listingId}>
                  {conversation.role}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {conversationsError && <p className="p-4 text-sm text-[#a2534c]" role="alert">{conversationsError}</p>}
      {!conversationsError && loading && <p className="p-4 text-sm text-[#687b7e]">Loading conversations…</p>}
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {!loading && !conversationsError && conversations.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-[#829092]">
            {totalConversations === 0 ? "No conversations yet. Contact an applicant to start one." : "No conversations match these filters."}
          </li>
        )}
        {conversations.map((conversation) => (
          <li key={conversation.conversationId}>
            <button
              aria-current={conversationId === conversation.conversationId ? "true" : undefined}
              className={`flex w-full items-start gap-3 border-b border-[#f0f3f3] px-4 py-4 text-left transition hover:bg-[#f7fbfa] focus-visible:z-10 focus-visible:outline-[3px] focus-visible:outline-inset focus-visible:outline-[#67c9c1] ${conversationId === conversation.conversationId ? "bg-[#f0f8f6]" : ""}`}
              onClick={() => onConversationSelect(conversation)}
              type="button"
            >
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6f4f0] text-sm font-bold text-[#087879]">
                {conversation.applicantName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[#344749]">{conversation.applicantName}</span>
                  <time className="shrink-0 text-[10px] text-[#829092]" dateTime={conversation.lastMessageAt}>
                    {formatMessageTimestamp(conversation.lastMessageAt)}
                  </time>
                  {unreadIds.has(conversation.conversationId) && (
                    <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-[#078b8d]" />
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[#687b7e]">{conversation.role} · {conversation.companyName}</span>
                <span className="mt-1 block truncate text-xs text-[#829092]">{conversation.lastMessagePreview}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
