/**
 * Spaced Repetition for weak questions from completed PracticeAttempts.
 * Uses fixed intervals: 1, 3, 7, 14, 30 days.
 * Separate from the existing practice-storage.ts spaced rep system.
 */

const STORAGE_KEY = 'cfa-buddy-spaced-rep';
const MASTERED_KEY = 'cfa-buddy-spaced-rep-mastered';
const MAX_QUEUE_SIZE = 200;

const INTERVALS = [1, 3, 7, 14, 30] as const;

export interface SpacedRepetitionItem {
  questionId: string;
  interval: number; // days: 1, 3, 7, 14, or 30
  nextDueDate: string; // ISO date string
  timesReviewed: number;
  lastReviewedAt: string; // ISO date string
  originAttemptId: string;
}

export interface SpacedRepetitionStats {
  total: number;
  dueToday: number;
  mastered: number;
}

/**
 * Get all items currently in the spaced repetition queue from localStorage.
 */
export function getRepetitionQueue(): SpacedRepetitionItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save the queue to localStorage.
 */
function saveQueue(queue: SpacedRepetitionItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Get the mastered count from localStorage.
 */
function getMasteredCount(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(MASTERED_KEY);
  if (!raw) return 0;
  try {
    return JSON.parse(raw);
  } catch {
    return 0;
  }
}

/**
 * Increment the mastered count.
 */
function incrementMastered(): void {
  if (typeof window === 'undefined') return;
  const count = getMasteredCount();
  localStorage.setItem(MASTERED_KEY, JSON.stringify(count + 1));
}

/**
 * Add a question to the spaced repetition queue.
 * Skips if the question is already in the queue.
 * Enforces a maximum queue size to prevent unbounded growth.
 */
export function addToRepetitionQueue(questionId: string, attemptId: string): void {
  if (typeof window === 'undefined') return;
  const queue = getRepetitionQueue();

  // Skip if already in queue
  if (queue.some(item => item.questionId === questionId)) return;

  // Enforce max queue size: drop the oldest item (furthest due date already passed)
  if (queue.length >= MAX_QUEUE_SIZE) {
    // Remove the item with the longest interval (most advanced, closest to mastery)
    const maxIntervalIdx = queue.reduce((maxIdx, item, idx, arr) =>
      item.interval > arr[maxIdx].interval ? idx : maxIdx, 0);
    queue.splice(maxIntervalIdx, 1);
  }

  const now = new Date();
  const nextDue = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  const item: SpacedRepetitionItem = {
    questionId,
    interval: 1,
    nextDueDate: nextDue.toISOString(),
    timesReviewed: 0,
    lastReviewedAt: now.toISOString(),
    originAttemptId: attemptId,
  };

  queue.push(item);
  saveQueue(queue);
}

/**
 * Advance a spaced repetition item based on whether the answer was correct.
 * If correct: advance interval (1->3->7->14->30->remove as mastered).
 * If wrong: reset interval to 1 day.
 */
export function advanceRepetitionItem(questionId: string, correct: boolean): void {
  if (typeof window === 'undefined') return;
  const queue = getRepetitionQueue();
  const idx = queue.findIndex(item => item.questionId === questionId);
  if (idx === -1) return;

  const item = queue[idx];
  const now = new Date();

  if (correct) {
    const currentIntervalIdx = INTERVALS.indexOf(item.interval as typeof INTERVALS[number]);
    const nextIntervalIdx = currentIntervalIdx + 1;

    if (nextIntervalIdx >= INTERVALS.length) {
      // Mastered: remove from queue
      queue.splice(idx, 1);
      incrementMastered();
    } else {
      const nextInterval = INTERVALS[nextIntervalIdx];
      item.interval = nextInterval;
      item.nextDueDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000).toISOString();
      item.timesReviewed += 1;
      item.lastReviewedAt = now.toISOString();
    }
  } else {
    // Wrong: reset to interval 1
    item.interval = 1;
    item.nextDueDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
    item.timesReviewed += 1;
    item.lastReviewedAt = now.toISOString();
  }

  saveQueue(queue);
}

/**
 * Get items that are due for review (nextDueDate <= now).
 */
export function getDueItems(): SpacedRepetitionItem[] {
  const queue = getRepetitionQueue();
  const now = new Date().toISOString();
  return queue.filter(item => item.nextDueDate <= now);
}

/**
 * Get stats about the spaced repetition queue.
 */
export function getRepetitionStats(): SpacedRepetitionStats {
  const queue = getRepetitionQueue();
  const now = new Date().toISOString();
  const dueToday = queue.filter(item => item.nextDueDate <= now).length;
  const mastered = getMasteredCount();

  return {
    total: queue.length,
    dueToday,
    mastered,
  };
}
