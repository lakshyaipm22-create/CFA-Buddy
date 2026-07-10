import type { Flashcard, ReviewRating } from '../types';

/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo 2 by Piotr Wozniak
 *
 * quality: 0-5 scale mapped from ReviewRating
 *   again=0, hard=2, good=4, easy=5
 */

const RATING_QUALITY: Record<ReviewRating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

export function reviewCard(card: Flashcard, rating: ReviewRating): Flashcard {
  const quality = RATING_QUALITY[rating];
  const now = new Date().toISOString();

  let { easeFactor, interval, repetitions, state } = card;

  if (quality < 3) {
    // Failed — reset
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

export function getCardsDueToday(cards: Flashcard[]): Flashcard[] {
  const now = new Date().toISOString();
  return cards
    .filter(c => c.state !== 'mastered' && c.nextReview <= now)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

export function computeStats(cards: Flashcard[], reviewedToday: number): {
  total: number;
  dueToday: number;
  mastered: number;
  retention: number;
  studiedToday: number;
} {
  const due = getCardsDueToday(cards).length;
  const mastered = cards.filter(c => c.state === 'mastered').length;
  const reviewed = cards.filter(c => c.lastReview !== null);
  const retention = reviewed.length > 0
    ? Math.round((mastered + cards.filter(c => c.state === 'review').length) / reviewed.length * 100)
    : 0;

  return { total: cards.length, dueToday: due, mastered, retention: Math.min(100, retention), studiedToday: reviewedToday };
}
