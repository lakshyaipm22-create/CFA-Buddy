import type { WeeklySnapshot } from '../types';

const STORAGE_KEY = 'cfa-buddy-weekly-reports';

/**
 * Get all stored weekly snapshots from localStorage.
 */
export function getWeeklySnapshots(): WeeklySnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * Save a weekly snapshot to localStorage.
 * If a snapshot for the same week exists, it is replaced.
 */
export function saveWeeklySnapshot(snapshot: WeeklySnapshot): void {
  if (typeof window === 'undefined') return;
  const snapshots = getWeeklySnapshots();
  const existingIndex = snapshots.findIndex(
    (s) => s.weekStart === snapshot.weekStart
  );
  if (existingIndex >= 0) {
    snapshots[existingIndex] = snapshot;
  } else {
    snapshots.push(snapshot);
  }
  // Keep only last 12 weeks
  const trimmed = snapshots.slice(-12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Get the Monday (start) of the week for a given date.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (day 0 = Sunday => shift back 6 days)
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Sunday (end) of the week for a given date.
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Format a date to ISO date string (YYYY-MM-DD).
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
