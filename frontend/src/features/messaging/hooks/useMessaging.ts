import { useCallback, useEffect, useState } from "react";
import {
  getMessages,
  getUnreadCount,
  listConversations,
  listNotifications,
  markRead,
} from "@/features/messaging/api";
import { subscribe } from "@/features/messaging/realtime";
import type {
  Conversation,
  Message,
  MessagingActor,
  MessagingRealtimeEvent,
  NotificationItem,
} from "@/features/messaging/types";

function eventIncludesActor(event: MessagingRealtimeEvent, actor: MessagingActor): boolean {
  const participantId = actor.role === "applicant" ? actor.email.trim().toLocaleLowerCase() : actor.id;
  return event.participantIds.includes(participantId);
}

export function useConversations(actor: MessagingActor | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(Boolean(actor));
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!actor) {
      setConversations([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setConversations(await listConversations(actor));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Could not load conversations."));
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    if (!actor) return;
    return subscribe((event) => {
      if (eventIncludesActor(event, actor)) void refresh();
    });
  }, [actor, refresh]);

  return { conversations, loading, error, refresh };
}

export function useThread(conversationId: string | null, actor: MessagingActor | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(Boolean(conversationId && actor));
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId || !actor) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setMessages(await getMessages(conversationId, actor));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Could not load messages."));
    } finally {
      setLoading(false);
    }
  }, [actor, conversationId]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    if (!conversationId || !actor) return;
    void markRead(conversationId, actor).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught : new Error("Could not mark messages as read."));
    });
    return subscribe((event) => {
      if (event.conversationId === conversationId && eventIncludesActor(event, actor)) {
        void refresh();
      }
    });
  }, [actor, conversationId, refresh]);

  return { messages, loading, error, refresh };
}

export function useUnreadCount(actor: MessagingActor | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!actor) {
      setUnreadCount(0);
      setError(null);
      return;
    }
    try {
      setUnreadCount(await getUnreadCount(actor));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Could not load unread count."));
    }
  }, [actor]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    if (!actor) return;
    return subscribe((event) => {
      if (eventIncludesActor(event, actor)) void refresh();
    });
  }, [actor, refresh]);

  return { unreadCount, error, refresh };
}

export function useNotifications(actor: MessagingActor | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(Boolean(actor));
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!actor) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setNotifications(await listNotifications(actor));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Could not load notifications."));
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    if (!actor) return;
    return subscribe((event) => {
      if (eventIncludesActor(event, actor)) void refresh();
    });
  }, [actor, refresh]);

  return { notifications, loading, error, refresh };
}
