/**
 * Pattern Storage - Caches pattern analysis results in localStorage
 * with invalidation based on attempt count changes.
 */

import type { PatternAnalysis, PatternCache } from '../types';

const STORAGE_KEY = 'cfa-buddy-mistake-patterns';

/**
 * Get cached pattern analysis. Returns null if cache is invalid or missing.
 */
export function getCachedAnalysis(currentAttemptCount: number): PatternAnalysis | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const cache: PatternCache = JSON.parse(raw);

    // Invalidate if attempt count has changed
    if (cache.lastAttemptCount !== currentAttemptCount) {
      return null;
    }

    return cache.analysis;
  } catch {
    return null;
  }
}

/**
 * Save pattern analysis to localStorage with current attempt count.
 */
export function saveAnalysisCache(analysis: PatternAnalysis, attemptCount: number): void {
  if (typeof window === 'undefined') return;

  const cache: PatternCache = {
    analysis,
    lastAttemptCount: attemptCount,
    cachedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage quota exceeded - silently fail
  }
}

/**
 * Clear the pattern analysis cache (for testing or manual refresh).
 */
export function clearAnalysisCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
