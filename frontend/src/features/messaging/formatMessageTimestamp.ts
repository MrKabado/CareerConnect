export function formatMessageTimestamp(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown time";

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) {
    return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  }

  const elapsedWeeks = Math.floor(elapsedDays / 7);
  if (elapsedWeeks < 5) {
    return `${elapsedWeeks} wk${elapsedWeeks === 1 ? "" : "s"} ago`;
  }

  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatCenteredMessageTime(value: string): string {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) return "Unknown time";

  return timestamp.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
