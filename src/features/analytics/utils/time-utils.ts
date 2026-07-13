/**
 * Format a duration in seconds to a human-readable string.
 * E.g., 1394 -> "23 min 14 sec"
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 sec';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} sec`);

  return parts.join(' ');
}

/**
 * Format an ISO timestamp to a human-readable format.
 * E.g., "2026-07-10T15:42:00.000Z" -> "Jul 10, 2026 at 3:42 PM"
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ',').replace(' at ', ' at ').replace(/, (\d)/, ', $1');
}

/**
 * Format a date range for display.
 * E.g., "Saturday, July 10, 2026 - 3:42 PM - 4:15 PM"
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Invalid date range';

  const dayStr = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dayStr} - ${startTime} - ${endTime}`;
}

/**
 * Get a relative time string (e.g., "2 days ago", "Just now")
 */
export function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
