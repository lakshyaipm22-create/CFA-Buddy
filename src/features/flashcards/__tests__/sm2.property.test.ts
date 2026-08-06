import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { reviewCard } from '../utils/sm2';
import type { Flashcard, ReviewRating } from '../types';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'test-card',
    front: 'What is NPV?',
    back: 'Net Present Value',
    subject: 'Corporate Finance',
    topic: null,
    state: 'new',
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('SM-2 Algorithm Property Tests', () => {
  it('ease factor never drops below 1.3', () => {
    const ratingArb = fc.constantFrom<ReviewRating>('again', 'hard', 'good', 'easy');
    const sequenceArb = fc.array(ratingArb, { minLength: 1, maxLength: 50 });

    fc.assert(
      fc.property(sequenceArb, (ratings) => {
        let card = makeCard();
        for (const rating of ratings) {
          card = reviewCard(card, rating);
        }
        expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
      }),
      { numRuns: 200 }
    );
  });

  it('interval always increases for consecutive good ratings after initial reps', () => {
    const countArb = fc.integer({ min: 3, max: 20 });

    fc.assert(
      fc.property(countArb, (count) => {
        let card = makeCard();
        const intervals: number[] = [];

        for (let i = 0; i < count; i++) {
          card = reviewCard(card, 'good');
          intervals.push(card.interval);
        }

        // After the first 2 repetitions (rep 1 = interval 1, rep 2 = interval 6),
        // subsequent intervals should be non-decreasing
        for (let i = 2; i < intervals.length; i++) {
          expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('again rating always resets repetitions to 0', () => {
    const preRatingCountArb = fc.integer({ min: 0, max: 10 });

    fc.assert(
      fc.property(preRatingCountArb, (preCount) => {
        let card = makeCard();
        // Build up some repetitions
        for (let i = 0; i < preCount; i++) {
          card = reviewCard(card, 'good');
        }
        // Then rate "again"
        card = reviewCard(card, 'again');
        expect(card.repetitions).toBe(0);
        expect(card.interval).toBe(1);
        expect(card.state).toBe('learning');
      }),
      { numRuns: 100 }
    );
  });

  it('easy rating produces higher ease factor than good rating from same state', () => {
    const repetitionsArb = fc.integer({ min: 0, max: 10 });

    fc.assert(
      fc.property(repetitionsArb, (reps) => {
        let cardA = makeCard();
        let cardB = makeCard();

        // Build up equal state
        for (let i = 0; i < reps; i++) {
          cardA = reviewCard(cardA, 'good');
          cardB = reviewCard(cardB, 'good');
        }

        // Now rate differently
        const afterGood = reviewCard(cardA, 'good');
        const afterEasy = reviewCard(cardB, 'easy');

        expect(afterEasy.easeFactor).toBeGreaterThanOrEqual(afterGood.easeFactor);
      }),
      { numRuns: 100 }
    );
  });
});
