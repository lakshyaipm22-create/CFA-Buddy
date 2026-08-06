import { describe, it, expect } from 'vitest';
import { scheduleReview, getDueCards, getNextReviewDate, getDailyReviewCount, computeRetentionRate } from '../utils/scheduler';
import type { ScheduledCard } from '../types';

function makeCard(overrides: Partial<ScheduledCard> = {}): ScheduledCard {
  return {
    id: 'card-1',
    front: 'What is WACC?',
    back: 'Weighted Average Cost of Capital',
    subject: 'Corporate Finance',
    topic: 'Cost of Capital',
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

describe('Spaced Repetition Scheduler', () => {
  describe('scheduleReview', () => {
    it('resets card on "again" rating', () => {
      const card = makeCard({ repetitions: 3, interval: 6, state: 'review' });
      const updated = scheduleReview(card, 'again');

      expect(updated.repetitions).toBe(0);
      expect(updated.interval).toBe(1);
      expect(updated.state).toBe('learning');
      expect(updated.lastReview).not.toBeNull();
    });

    it('resets card on "hard" rating (quality < 3)', () => {
      const card = makeCard({ repetitions: 2, interval: 6, state: 'review' });
      const updated = scheduleReview(card, 'hard');

      expect(updated.repetitions).toBe(0);
      expect(updated.interval).toBe(1);
      expect(updated.state).toBe('learning');
    });

    it('sets interval to 1 on first "good" rating', () => {
      const card = makeCard({ repetitions: 0, interval: 0, state: 'new' });
      const updated = scheduleReview(card, 'good');

      expect(updated.repetitions).toBe(1);
      expect(updated.interval).toBe(1);
      expect(updated.state).toBe('learning');
    });

    it('sets interval to 6 on second "good" rating', () => {
      const card = makeCard({ repetitions: 1, interval: 1, state: 'learning' });
      const updated = scheduleReview(card, 'good');

      expect(updated.repetitions).toBe(2);
      expect(updated.interval).toBe(6);
      expect(updated.state).toBe('review');
    });

    it('multiplies interval by ease factor on third+ "good" rating', () => {
      const card = makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5, state: 'review' });
      const updated = scheduleReview(card, 'good');

      expect(updated.repetitions).toBe(3);
      expect(updated.interval).toBe(15); // 6 * 2.5 = 15
      expect(updated.state).toBe('review');
    });

    it('marks card as mastered when interval > 21 and ease > 2.0', () => {
      const card = makeCard({ repetitions: 4, interval: 15, easeFactor: 2.5, state: 'review' });
      const updated = scheduleReview(card, 'easy');

      // interval = 15 * 2.5 = 38 (rounded), ease updated to > 2.0
      expect(updated.interval).toBe(38);
      expect(updated.state).toBe('mastered');
    });

    it('decreases ease factor on "again" rating but never below 1.3', () => {
      const card = makeCard({ easeFactor: 1.4 });
      const updated = scheduleReview(card, 'again');

      expect(updated.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('increases ease factor on "easy" rating', () => {
      const card = makeCard({ easeFactor: 2.5, repetitions: 0 });
      const updated = scheduleReview(card, 'easy');

      expect(updated.easeFactor).toBeGreaterThan(2.5);
    });

    it('sets nextReview to a future date', () => {
      const card = makeCard();
      const updated = scheduleReview(card, 'good');
      const nextReview = new Date(updated.nextReview);
      const now = new Date();

      expect(nextReview.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });
  });

  describe('getDueCards', () => {
    it('returns cards where nextReview is in the past', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow

      const cards: ScheduledCard[] = [
        makeCard({ id: '1', nextReview: pastDate, state: 'learning' }),
        makeCard({ id: '2', nextReview: futureDate, state: 'learning' }),
        makeCard({ id: '3', nextReview: pastDate, state: 'review' }),
      ];

      const due = getDueCards(cards);
      expect(due).toHaveLength(2);
      expect(due.map(c => c.id)).toContain('1');
      expect(due.map(c => c.id)).toContain('3');
    });

    it('excludes mastered cards', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const cards: ScheduledCard[] = [
        makeCard({ id: '1', nextReview: pastDate, state: 'mastered' }),
        makeCard({ id: '2', nextReview: pastDate, state: 'learning' }),
      ];

      const due = getDueCards(cards);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('2');
    });

    it('returns empty array when no cards are due', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const cards: ScheduledCard[] = [
        makeCard({ id: '1', nextReview: futureDate, state: 'learning' }),
      ];

      const due = getDueCards(cards);
      expect(due).toHaveLength(0);
    });

    it('sorts cards by nextReview date (oldest first)', () => {
      const date1 = new Date(Date.now() - 172800000).toISOString(); // 2 days ago
      const date2 = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

      const cards: ScheduledCard[] = [
        makeCard({ id: '2', nextReview: date2, state: 'learning' }),
        makeCard({ id: '1', nextReview: date1, state: 'learning' }),
      ];

      const due = getDueCards(cards);
      expect(due[0].id).toBe('1');
      expect(due[1].id).toBe('2');
    });

    it('uses custom date parameter when provided', () => {
      const targetDate = new Date('2025-06-01T12:00:00Z');
      const beforeTarget = new Date('2025-05-31T12:00:00Z').toISOString();
      const afterTarget = new Date('2025-06-02T12:00:00Z').toISOString();

      const cards: ScheduledCard[] = [
        makeCard({ id: '1', nextReview: beforeTarget, state: 'learning' }),
        makeCard({ id: '2', nextReview: afterTarget, state: 'learning' }),
      ];

      const due = getDueCards(cards, targetDate);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('1');
    });
  });

  describe('getNextReviewDate', () => {
    it('returns "Mastered" for mastered cards', () => {
      const card = makeCard({ state: 'mastered' });
      expect(getNextReviewDate(card)).toBe('Mastered');
    });

    it('returns "Due now" for overdue cards', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const card = makeCard({ nextReview: pastDate, state: 'learning' });
      expect(getNextReviewDate(card)).toBe('Due now');
    });

    it('returns "Tomorrow" for cards due tomorrow', () => {
      // Use 18 hours from now which is < 24h, ceil(18/24) = ceil(0.75) = 1 day
      const now = new Date();
      const tomorrowClose = new Date(now.getTime() + 18 * 60 * 60 * 1000);
      const card = makeCard({ nextReview: tomorrowClose.toISOString(), state: 'learning' });
      expect(getNextReviewDate(card)).toBe('Tomorrow');
    });

    it('returns "In X days" for cards due within a week', () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      const card = makeCard({ nextReview: inThreeDays.toISOString(), state: 'review' });
      expect(getNextReviewDate(card)).toBe('In 3 days');
    });
  });

  describe('getDailyReviewCount', () => {
    it('counts reviews from today only', () => {
      const today = new Date().toISOString();
      const yesterday = new Date(Date.now() - 86400000).toISOString();

      const history = [
        { reviewedAt: today },
        { reviewedAt: today },
        { reviewedAt: yesterday },
      ];

      expect(getDailyReviewCount(history)).toBe(2);
    });

    it('returns 0 when no reviews today', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const history = [{ reviewedAt: yesterday }];

      expect(getDailyReviewCount(history)).toBe(0);
    });

    it('returns 0 for empty history', () => {
      expect(getDailyReviewCount([])).toBe(0);
    });
  });

  describe('computeRetentionRate', () => {
    it('returns 0 when no cards have been reviewed', () => {
      const cards = [makeCard({ lastReview: null })];
      expect(computeRetentionRate(cards)).toBe(0);
    });

    it('calculates retention correctly', () => {
      const cards: ScheduledCard[] = [
        makeCard({ id: '1', state: 'review', lastReview: '2025-01-01' }),
        makeCard({ id: '2', state: 'mastered', lastReview: '2025-01-01' }),
        makeCard({ id: '3', state: 'learning', lastReview: '2025-01-01' }),
      ];

      // 2 out of 3 are in review/mastered state
      expect(computeRetentionRate(cards)).toBe(67);
    });

    it('returns 100 when all reviewed cards are retained', () => {
      const cards: ScheduledCard[] = [
        makeCard({ id: '1', state: 'review', lastReview: '2025-01-01' }),
        makeCard({ id: '2', state: 'mastered', lastReview: '2025-01-01' }),
      ];

      expect(computeRetentionRate(cards)).toBe(100);
    });
  });
});
