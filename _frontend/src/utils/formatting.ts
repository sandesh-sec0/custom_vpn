/**
 * Formatting Utilities
 *
 * Pure functions for formatting values in the UI.
 * No side effects, no imports from app code.
 */

// ─── Bytes ───────────────────────────────────────────────────────────────────

/**
 * Format a byte count into a human-readable string.
 * @example formatBytes(1536) → "1.5 KB"
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// ─── Duration ────────────────────────────────────────────────────────────────

/**
 * Format a duration in seconds into a compact string.
 * @example formatDuration(3661) → "1h 1m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Date / Time ─────────────────────────────────────────────────────────────

/**
 * Format an ISO 8601 timestamp into a short date string.
 * @example formatDate("2026-04-12T10:30:00Z") → "Apr 12, 2026"
 */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format an ISO 8601 timestamp into a date + time string.
 * @example formatDateTime("2026-04-12T10:30:00Z") → "Apr 12, 2026, 10:30 AM"
 */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Return a relative time string (e.g., "3 minutes ago").
 */
export function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '—';
  }
}

// ─── Session ─────────────────────────────────────────────────────────────────

/**
 * Truncate a UUID session ID for display.
 * @example truncateSessionId("abc-def-ghi-jkl") → "abc-d…"
 */
export function truncateSessionId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 12)}…`;
}

/**
 * Calculate session duration from created_at to last_active.
 */
export function sessionDuration(createdAt: string, lastActive: string): string {
  try {
    const diff = (new Date(lastActive).getTime() - new Date(createdAt).getTime()) / 1000;
    return formatDuration(Math.max(0, diff));
  } catch {
    return '—';
  }
}
