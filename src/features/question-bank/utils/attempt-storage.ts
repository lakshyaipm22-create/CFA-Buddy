import type { PracticeAttempt } from '../types/attempt';
import { addToRepetitionQueue } from './spaced-repetition';

const ATTEMPTS_KEY = 'cfa-buddy-attempts';

/**
 * Get all attempts for a specific subject from localStorage
 */
export function getAttempts(subject: string): PracticeAttempt[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(ATTEMPTS_KEY);
  if (!raw) return [];
  try {
    const all: PracticeAttempt[] = JSON.parse(raw);
    return all.filter(a => a.subjectName === subject);
  } catch {
    return [];
  }
}

/**
 * Save a practice attempt (create or update)
 * Also auto-queues incorrect questions into spaced repetition.
 */
export function saveAttempt(attempt: PracticeAttempt): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(ATTEMPTS_KEY);
  let all: PracticeAttempt[] = [];
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {
      all = [];
    }
  }
  const idx = all.findIndex(a => a.id === attempt.id);
  if (idx >= 0) {
    all[idx] = attempt;
  } else {
    all.push(attempt);
  }
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));

  // Auto-queue incorrect questions into spaced repetition
  // Wrapped in try/catch to prevent localStorage quota errors from breaking attempt saves
  try {
    for (const moduleResult of attempt.moduleResults) {
      for (const qa of moduleResult.questionAttempts) {
        if (!qa.correct) {
          addToRepetitionQueue(qa.questionId, attempt.id);
        }
      }
    }
  } catch {
    // Spaced repetition queueing is best-effort; attempt is already saved above
    console.warn('Failed to queue questions for spaced repetition (localStorage may be full)');
  }
}

/**
 * Get the latest (most recent) attempt for a subject
 */
export function getLatestAttempt(subject: string): PracticeAttempt | null {
  const attempts = getAttempts(subject);
  if (attempts.length === 0) return null;
  return attempts.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )[0];
}

/**
 * Get a specific attempt by ID
 */
export function getAttemptById(id: string): PracticeAttempt | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ATTEMPTS_KEY);
  if (!raw) return null;
  try {
    const all: PracticeAttempt[] = JSON.parse(raw);
    return all.find(a => a.id === id) ?? null;
  } catch {
    return null;
  }
}
