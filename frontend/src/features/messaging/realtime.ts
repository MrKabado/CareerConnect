import type { MessagingRealtimeEvent } from "@/features/messaging/types";

const CHANNEL_NAME = "careerconnect.messaging.realtime";
const STORAGE_EVENT_KEY = "careerconnect.messaging.realtime.event";
const listeners = new Set<(event: MessagingRealtimeEvent) => void>();
let channel: BroadcastChannel | null = null;
let subscribedToStorage = false;

function isRealtimeEvent(value: unknown): value is MessagingRealtimeEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<MessagingRealtimeEvent>;
  return (
    typeof event.type === "string" &&
    [
      "conversation_created",
      "message_created",
      "conversation_updated",
      "notification_updated",
    ].includes(event.type) &&
    typeof event.conversationId === "string" &&
    Array.isArray(event.participantIds) &&
    typeof event.occurredAt === "string"
  );
}

function dispatch(event: MessagingRealtimeEvent): void {
  listeners.forEach((listener) => listener(event));
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
  try {
    const parsed: unknown = JSON.parse(event.newValue);
    if (isRealtimeEvent(parsed)) dispatch(parsed);
  } catch {
    // Ignore storage events not written by this messaging channel.
  }
}

function attachTransport(): void {
  if (typeof BroadcastChannel !== "undefined" && !channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (isRealtimeEvent(event.data)) dispatch(event.data);
    });
  }
  if (!subscribedToStorage) {
    window.addEventListener("storage", handleStorage);
    subscribedToStorage = true;
  }
}

function detachTransport(): void {
  channel?.close();
  channel = null;
  if (subscribedToStorage) {
    window.removeEventListener("storage", handleStorage);
    subscribedToStorage = false;
  }
}

export function subscribe(handler: (event: MessagingRealtimeEvent) => void): () => void {
  listeners.add(handler);
  attachTransport();
  return () => {
    listeners.delete(handler);
    if (listeners.size === 0) detachTransport();
  };
}

export function publish(event: MessagingRealtimeEvent): void {
  dispatch(event);
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const publisher = new BroadcastChannel(CHANNEL_NAME);
      publisher.postMessage(event);
      publisher.close();
    } else {
      window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(event));
      window.localStorage.removeItem(STORAGE_EVENT_KEY);
    }
  } catch {
    // The local tab still receives the event; persistence errors are surfaced by the API write.
  }
}

// TODO(backend): Replace this browser-only event transport with the authenticated WebSocket/realtime service.
