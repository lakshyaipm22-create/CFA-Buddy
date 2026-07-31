/**
 * Tracks recently visited pages in localStorage.
 * Used by the command palette to show "Recent Pages" and for onboarding completion checks.
 */

const STORAGE_KEY = 'cfa-buddy-recent-pages';
const MAX_ENTRIES = 10;

export interface PageVisit {
  path: string;
  title: string;
  timestamp: string;
}

/**
 * Record a page visit. Deduplicates by path (moves to front if already visited).
 */
export function recordPageVisit(path: string, title: string): void {
  if (typeof window === 'undefined') return;
  try {
    const visits = getRecentPages();
    const filtered = visits.filter((v) => v.path !== path);
    filtered.unshift({ path, title, timestamp: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get the list of recently visited pages, most recent first.
 */
export function getRecentPages(): PageVisit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PageVisit[];
  } catch {
    return [];
  }
}

/**
 * Check if a specific path has ever been visited.
 */
export function hasVisitedPage(path: string): boolean {
  return getRecentPages().some((v) => v.path === path);
}
