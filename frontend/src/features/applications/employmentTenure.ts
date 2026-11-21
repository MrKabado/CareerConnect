function dateParts(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

export function formatEmploymentTenure(
  startedAt: string,
  endedAt: string | null | undefined,
  now = Date.now(),
): string | null {
  const start = dateParts(startedAt);
  const end = endedAt
    ? dateParts(endedAt)
    : dateParts(new Date(now).toISOString());

  if (!start || !end) return null;

  const startTime = Date.UTC(start.year, start.month, start.day);
  const endTime = Date.UTC(end.year, end.month, end.day);
  if (endTime < startTime) return null;

  let months = (end.year - start.year) * 12 + end.month - start.month;
  const lastDayOfEndMonth = new Date(Date.UTC(end.year, end.month + 1, 0)).getUTCDate();
  if (end.day < Math.min(start.day, lastDayOfEndMonth)) months -= 1;

  const anchorMonth = start.month + months;
  const anchorYear = start.year + Math.floor(anchorMonth / 12);
  const normalizedMonth = anchorMonth % 12;
  const lastDayOfAnchorMonth = new Date(
    Date.UTC(anchorYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const anchorDay = Math.min(start.day, lastDayOfAnchorMonth);
  const anchorTime = Date.UTC(anchorYear, normalizedMonth, anchorDay);
  const days = Math.floor((endTime - anchorTime) / 86_400_000);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const duration = [
    years ? `${years} ${years === 1 ? "year" : "years"}` : null,
    remainingMonths
      ? `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`
      : null,
    days ? `${days} ${days === 1 ? "day" : "days"}` : null,
  ].filter(Boolean);

  return duration.join(", ") || "0 days";
}
