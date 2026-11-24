import type Echo from "laravel-echo";

declare global {
  interface Window {
    Pusher: typeof import("pusher-js").default;
  }
}

export type RealtimeResource = "notifications" | "applications" | "job_listings";

export type UserRealtimeUpdate = {
  resource: RealtimeResource;
  action: "created" | "updated" | "deleted";
  occurred_at: string;
};

export type PublicJobListingsUpdate = {
  action: "created" | "updated" | "deleted";
  occurred_at: string;
};

type EchoClient = Echo<"reverb">;

const userListeners = new Set<(update: UserRealtimeUpdate) => void>();
const jobListingListeners = new Set<(update: PublicJobListingsUpdate) => void>();
let activeEcho: EchoClient | null = null;
let connectionSequence = 0;

function isUserRealtimeUpdate(value: unknown): value is UserRealtimeUpdate {
  if (!value || typeof value !== "object") return false;
  const update = value as Partial<UserRealtimeUpdate>;
  return (
    (update.resource === "notifications" ||
      update.resource === "applications" ||
      update.resource === "job_listings") &&
    (update.action === "created" ||
      update.action === "updated" ||
      update.action === "deleted") &&
    typeof update.occurred_at === "string"
  );
}

function isPublicJobListingsUpdate(value: unknown): value is PublicJobListingsUpdate {
  if (!value || typeof value !== "object") return false;
  const update = value as Partial<PublicJobListingsUpdate>;
  return (
    (update.action === "created" ||
      update.action === "updated" ||
      update.action === "deleted") &&
    typeof update.occurred_at === "string"
  );
}

export async function connectRealtime(
  token: string | null,
  userId: string | null,
): Promise<() => void> {
  const sequence = ++connectionSequence;
  activeEcho?.disconnect();
  activeEcho = null;

  const key = import.meta.env.VITE_REVERB_APP_KEY;
  if (!key) return () => {};

  const [{ default: EchoConstructor }, { default: Pusher }] = await Promise.all([
    import("laravel-echo"),
    import("pusher-js"),
  ]);
  if (sequence !== connectionSequence) return () => {};

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  const apiOrigin = new URL(apiBaseUrl).origin;
  const scheme = import.meta.env.VITE_REVERB_SCHEME || "http";
  const port = Number(import.meta.env.VITE_REVERB_PORT || 6001);

  window.Pusher = Pusher;
  const echo = new EchoConstructor({
    broadcaster: "reverb",
    key,
    wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${apiOrigin}/broadcasting/auth`,
    auth: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
  activeEcho = echo;

  echo.channel("public.job-listings").listen(
    ".public.job-listings.changed",
    (update: unknown) => {
      if (isPublicJobListingsUpdate(update)) {
        jobListingListeners.forEach((listener) => listener(update));
      }
    },
  );

  if (token && userId) {
    echo.private(`users.${userId}`).listen(".user.data.changed", (update: unknown) => {
      if (isUserRealtimeUpdate(update)) {
        userListeners.forEach((listener) => listener(update));
      }
    });
  }

  return () => {
    if (activeEcho !== echo) return;
    connectionSequence += 1;
    echo.leave("public.job-listings");
    if (token && userId) echo.leave(`users.${userId}`);
    echo.disconnect();
    activeEcho = null;
  };
}

export function subscribeToUserUpdates(
  listener: (update: UserRealtimeUpdate) => void,
): () => void {
  userListeners.add(listener);
  return () => userListeners.delete(listener);
}

export function subscribeToPublicJobListings(
  listener: (update: PublicJobListingsUpdate) => void,
): () => void {
  jobListingListeners.add(listener);
  return () => jobListingListeners.delete(listener);
}
