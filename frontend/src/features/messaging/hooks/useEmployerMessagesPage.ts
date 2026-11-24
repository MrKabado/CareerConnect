import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { employerMessageFilters } from "@/features/messaging/constants";
import { getEmployerMessagingActor, sendMessage } from "@/features/messaging/api";
import { useConversations, useNotifications, useThread } from "@/features/messaging/hooks";
import type { Conversation } from "@/features/messaging/types";

export type ConversationFilter = (typeof employerMessageFilters)[number][0];

export function useEmployerMessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const actor = useMemo(() => getEmployerMessagingActor(user), [user]);
  const conversationId = routeConversationId ? decodeURIComponent(routeConversationId) : null;
  const { conversations, loading, error: conversationsError, refresh: refreshConversations } = useConversations(actor);
  const { notifications } = useNotifications(actor);
  const selectedConversation = conversations.find((item) => item.conversationId === conversationId) ?? null;
  const { messages, loading: messagesLoading, error: messagesError, refresh: refreshMessages } = useThread(conversationId, actor);
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [listingId, setListingId] = useState("");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const unreadIds = new Set(
    notifications.filter((notification) => !notification.read).map((notification) => notification.conversationId),
  );
  const listingOptions = [...new Map(conversations.map((conversation) => [conversation.listingId, conversation])).values()];
  const filteredConversations = conversations.filter((conversation) => {
    const queryMatch = `${conversation.applicantName} ${conversation.role} ${conversation.companyName}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase());
    const filterMatch =
      filter === "all" ||
      (filter === "unread" && unreadIds.has(conversation.conversationId)) ||
      (filter === "needs-reply" && conversation.lastMessageSenderId !== actor?.id) ||
      (filter === "listing" && conversation.listingId === listingId);
    return queryMatch && filterMatch;
  });

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actor || !selectedConversation || !body.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(selectedConversation.conversationId, { body }, actor);
      setBody("");
      await Promise.all([refreshMessages(), refreshConversations()]);
    } catch (caught) {
      setSendError(caught instanceof Error ? caught.message : "Your message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  function openConversation(conversation: Conversation) {
    navigate(`/employer/messages/${encodeURIComponent(conversation.conversationId)}`);
  }

  return {
    actor,
    user,
    conversationId,
    conversations,
    loading,
    conversationsError,
    filteredConversations,
    selectedConversation,
    messages,
    messagesLoading,
    messagesError,
    unreadIds,
    listingOptions,
    filter,
    setFilter,
    listingId,
    setListingId,
    search,
    setSearch,
    body,
    setBody,
    sending,
    sendError,
    setSendError,
    handleSend,
    openConversation,
    navigate,
  };
}
