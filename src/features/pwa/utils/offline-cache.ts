/**
 * Offline Cache Utility
 *
 * Pre-caches question bank and flashcard data from localStorage
 * into the service worker Cache API for offline access.
 */

const QUESTION_STORAGE_KEY = 'cfa-buddy-questions';
const FLASHCARD_STORAGE_KEY = 'cfa-buddy-flashcards';

/**
 * Sends question bank data to the service worker for caching.
 * This ensures questions are available offline even if localStorage is cleared.
 */
export function cacheQuestionData(): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker?.controller) {
    return;
  }

  try {
    const questionData = localStorage.getItem(QUESTION_STORAGE_KEY);
    if (questionData) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_QUESTION_DATA',
        payload: JSON.parse(questionData),
      });
    }
  } catch {
    // Silently fail if localStorage read fails
  }
}

/**
 * Sends flashcard data to the service worker for caching.
 * This ensures flashcards are available offline.
 */
export function cacheFlashcardData(): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker?.controller) {
    return;
  }

  try {
    const flashcardData = localStorage.getItem(FLASHCARD_STORAGE_KEY);
    if (flashcardData) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_FLASHCARD_DATA',
        payload: JSON.parse(flashcardData),
      });
    }
  } catch {
    // Silently fail if localStorage read fails
  }
}

/**
 * Caches all user study data for offline access.
 * Should be called after SW registration and whenever data changes.
 */
export function cacheAllStudyData(): void {
  cacheQuestionData();
  cacheFlashcardData();
}

/**
 * Retrieves cached question data from the Cache API (fallback if localStorage empty).
 */
export async function getCachedQuestionData<T>(): Promise<T | null> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open('cfa-buddy-data-v2');
    const response = await cache.match('/offline-data/questions');
    if (response) {
      return response.json() as Promise<T>;
    }
  } catch {
    // Cache API not available
  }
  return null;
}

/**
 * Retrieves cached flashcard data from the Cache API (fallback if localStorage empty).
 */
export async function getCachedFlashcardData<T>(): Promise<T | null> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open('cfa-buddy-data-v2');
    const response = await cache.match('/offline-data/flashcards');
    if (response) {
      return response.json() as Promise<T>;
    }
  } catch {
    // Cache API not available
  }
  return null;
}
