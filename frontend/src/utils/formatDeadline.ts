const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function formatDay(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

/** Deadline text like "1 Nov 2026, 11:59 PM" in the user's local time; date-only values show just the date. */
export function formatDeadline(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!text) return 'No deadline';
  const date = DATE_ONLY.test(text) ? new Date(`${text}T00:00:00`) : new Date(text);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  if (DATE_ONLY.test(text)) return formatDay(date);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${formatDay(date)}, ${time}`;
}
