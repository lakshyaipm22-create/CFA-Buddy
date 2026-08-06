import type { ScheduledCard, ReviewRating } from '../types';

/**
 * SM-2 Spaced Repetition Scheduler
 * Self-contained implementation for the spaced-repetition feature.
 * Based on SuperMemo 2 by Piotr Wozniak.
 *
 * NOTE: This is intentionally separate from src/features/flashcards/utils/sm2.ts.
 * The flashcards feature owns its own SM-2 logic for card-level reviews, while this
 * scheduler manages the broader spaced-repetition review session flow with different
 * state shapes (ScheduledCard vs FlashcardSM2Data). Keeping them isolated avoids
 * cross-feature coupling and allows each feature to evolve independently.
 *
 * Rating quality mapping:
 *   again=0, hard=2, good=4, easy=5
 */

const RATING_QUALITY: Record<ReviewRating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

/**
 * Apply a review rating to a card using the SM-2 algorithm.
 * Returns the updated card with new interval, ease factor, and next review date.
 */
export function scheduleReview(card: ScheduledCard, rating: ReviewRating): ScheduledCard {
  const quality = RATING_QUALITY[rating];
  const now = new Date().toISOString();

  let { easeFactor, interval, repetitions, state } = card;

  if (quality < 3) {
    // Failed - reset repetitions
    repetitions = 0;
    interval = 1;
    state = 'learning';
  } else {
    // Passed
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
      state = 'learning';
    } else if (repetitions === 2) {
      interval = 6;
      state = 'review';
    } else {
      interval = Math.round(interval * easeFactor);
      state = 'review';
    }
  }

  // Update ease factor (never below 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Mark as mastered if interval > 21 days and ease > 2.0
  if (interval > 21 && easeFactor > 2.0 && state === 'review') {
    state = 'mastered';
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    state,
    nextReview: nextReview.toISOString(),
    lastReview: now,
  };
}

/**
 * Get all cards that are due for review on a given date.
 * Returns cards where nextReview <= date and state is not 'mastered'.
 */
export function getDueCards(cards: ScheduledCard[], date?: Date): ScheduledCard[] {
  const targetDate = (date ?? new Date()).toISOString();
  return cards
    .filter(c => c.state !== 'mastered' && c.nextReview <= targetDate)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

/**
 * Get the next review date for a card as a human-readable string.
 */
export function getNextReviewDate(card: ScheduledCard): string {
  if (card.state === 'mastered') return 'Mastered';
  const reviewDate = new Date(card.nextReview);
  const now = new Date();
  const diffMs = reviewDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Due now';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return reviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get the daily review count for today from a set of review history.
 */
export function getDailyReviewCount(reviewHistory: Array<{ reviewedAt: string }>): number {
  const today = new Date().toISOString().slice(0, 10);
  return reviewHistory.filter(r => r.reviewedAt.startsWith(today)).length;
}

/**
 * Compute retention rate from a set of cards.
 * Retention = (review + mastered cards) / (all cards that have been reviewed at least once)
 */
export function computeRetentionRate(cards: ScheduledCard[]): number {
  const reviewed = cards.filter(c => c.lastReview !== null);
  if (reviewed.length === 0) return 0;
  const retained = reviewed.filter(c => c.state === 'review' || c.state === 'mastered').length;
  return Math.min(100, Math.round((retained / reviewed.length) * 100));
}
