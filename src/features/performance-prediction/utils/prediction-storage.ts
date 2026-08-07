/**
 * Prediction Storage.
 * Caches daily prediction snapshots in localStorage for trend visualization.
 * Keeps the last 90 days of data.
 */

import type { PredictionSnapshot, PredictionFactor } from '../types';

const STORAGE_KEY = 'cfa-buddy-predictions';
const MAX_SNAPSHOTS = 90;

/**
 * Save a prediction snapshot for today.
 * If a snapshot for today already exists, it is replaced.
 */
export function savePredictionSnapshot(snapshot: PredictionSnapshot): void {
  if (typeof window === 'undefined') return;

  const snapshots = loadPredictionSnapshots();
  const todayIndex = snapshots.findIndex(s => s.date === snapshot.date);

  if (todayIndex >= 0) {
    snapshots[todayIndex] = snapshot;
  } else {
    snapshots.push(snapshot);
  }

  // Sort by date and keep only the last MAX_SNAPSHOTS days
  snapshots.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = snapshots.slice(-MAX_SNAPSHOTS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full; trim more aggressively
    const reduced = trimmed.slice(-30);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
    } catch {
      // Cannot save; continue silently
    }
  }
}

/**
 * Load all stored prediction snapshots.
 */
export function loadPredictionSnapshots(): PredictionSnapshot[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PredictionSnapshot[];
  } catch {
    return [];
  }
}

/**
 * Get the most recent prediction snapshot (if any).
 */
export function getLatestSnapshot(): PredictionSnapshot | null {
  const snapshots = loadPredictionSnapshots();
  if (snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

/**
 * Check if we have a fresh prediction for today.
 * Used to avoid recomputing if already done today.
 */
export function hasTodaySnapshot(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const snapshots = loadPredictionSnapshots();
  return snapshots.some(s => s.date === today);
}

/**
 * Create a snapshot from prediction results.
 */
export function createSnapshot(
  passProb: number,
  factors: PredictionFactor[],
  accuracy: number
): PredictionSnapshot {
  return {
    date: new Date().toISOString().split('T')[0],
    passProb,
    factors,
    accuracy,
  };
}

/**
 * Clear all stored predictions.
 */
export function clearPredictions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
