import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/features/auth/useAuth";
import { getApplicantMessagingActor, sendMessage } from "@/features/messaging/api";
import { useConversations, useNotifications, useThread } from "@/features/messaging/hooks";
import type { Conversation } from "@/features/messaging/types";

export function useApplicantMessagesPage() {
  const { user, status } = useAuth();
  const actor = useMemo(() => getApplicantMessagingActor(user), [user]);
  const isDemoPreview = import.meta.env.DEV && status === "unauthenticated";
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    refresh: refreshConversations,
  } = useConversations(actor);
  const { notifications } = useNotifications(actor);
  const conversationId = routeConversationId ? decodeURIComponent(routeConversationId) : null;
  const selectedConversation =
    conversations.find((item) => item.conversationId === conversationId) ?? null;
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    refresh: refreshMessages,
  } = useThread(conversationId, actor);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const unreadConversationIds = new Set(
    notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.conversationId),
  );
  const filteredConversations = conversations.filter((conversation) =>
    `${conversation.role} ${conversation.companyName}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    if (isDemoPreview && !conversationId && conversations.length > 0) {
      navigate(`/messages/${encodeURIComponent(conversations[0].conversationId)}`, {
        replace: true,
      });
    }
  }, [conversationId, conversations, isDemoPreview, navigate]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = messageText.trim();
    if (!actor || !selectedConversation || !body || sending) return;
    setSending(true);
    setSendError(null);
    setAnnouncement("Sending message.");
    try {
      await sendMessage(selectedConversation.conversationId, { body }, actor);
      setMessageText("");
      setAnnouncement("Message sent.");
      await Promise.all([refreshMessages(), refreshConversations()]);
    } catch (caught) {
      const errorMessage =
        caught instanceof Error ? caught.message : "Your message could not be sent.";
      setSendError(errorMessage);
      setAnnouncement(errorMessage);
    } finally {
      setSending(false);
    }
  }

  function chooseConversation(conversation: Conversation) {
    navigate(`/messages/${encodeURIComponent(conversation.conversationId)}`);
  }

  return {
    actor,
    conversationId,
    conversations,
    conversationsError,
    conversationsLoading,
    filteredConversations,
    handleSend,
    chooseConversation,
    isDemoPreview,
    messages,
    messagesError,
    messagesLoading,
    selectedConversation,
    search,
    setSearch,
    messageText,
    setMessageText,
    sending,
    sendError,
    announcement,
    unreadConversationIds,
    navigate,
    user,
  };
}
