import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getRepetitionQueue,
  addToRepetitionQueue,
  advanceRepetitionItem,
  getDueItems,
  getRepetitionStats,
} from '../utils/spaced-repetition';
import type { SpacedRepetitionItem } from '../utils/spaced-repetition';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock } });

describe('spaced-repetition', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getRepetitionQueue', () => {
    it('returns empty array when no data exists', () => {
      expect(getRepetitionQueue()).toEqual([]);
    });

    it('returns stored items from localStorage', () => {
      const items: SpacedRepetitionItem[] = [
        {
          questionId: 'q1',
          interval: 1,
          nextDueDate: '2025-06-16T12:00:00.000Z',
          timesReviewed: 0,
          lastReviewedAt: '2025-06-15T12:00:00.000Z',
          originAttemptId: 'attempt-1',
        },
      ];
      localStorageMock.setItem('cfa-buddy-spaced-rep', JSON.stringify(items));
      expect(getRepetitionQueue()).toEqual(items);
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('cfa-buddy-spaced-rep', 'invalid-json{{{');
      expect(getRepetitionQueue()).toEqual([]);
    });
  });

  describe('addToRepetitionQueue', () => {
    it('adds a new question to the queue with interval=1 and nextDueDate=now+1day', () => {
      addToRepetitionQueue('q1', 'attempt-1');

      const queue = getRepetitionQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].questionId).toBe('q1');
      expect(queue[0].interval).toBe(1);
      expect(queue[0].timesReviewed).toBe(0);
      expect(queue[0].originAttemptId).toBe('attempt-1');

      // nextDueDate should be 1 day from now
      const expectedDue = new Date('2025-06-16T12:00:00.000Z');
      expect(new Date(queue[0].nextDueDate).getTime()).toBe(expectedDue.getTime());
    });

    it('skips if question is already in queue (duplicate prevention)', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      addToRepetitionQueue('q1', 'attempt-2'); // same question, different attempt

      const queue = getRepetitionQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].originAttemptId).toBe('attempt-1'); // keeps original
    });

    it('adds multiple different questions', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      addToRepetitionQueue('q2', 'attempt-1');
      addToRepetitionQueue('q3', 'attempt-2');

      const queue = getRepetitionQueue();
      expect(queue).toHaveLength(3);
    });
  });

  describe('advanceRepetitionItem', () => {
    it('advances interval from 1 to 3 days on correct answer', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true);

      const queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(3);
      expect(queue[0].timesReviewed).toBe(1);

      const expectedDue = new Date('2025-06-18T12:00:00.000Z'); // +3 days
      expect(new Date(queue[0].nextDueDate).getTime()).toBe(expectedDue.getTime());
    });

    it('advances interval from 3 to 7 days on correct answer', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true); // 1 -> 3
      advanceRepetitionItem('q1', true); // 3 -> 7

      const queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(7);
    });

    it('advances interval from 7 to 14 days on correct answer', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true); // 1 -> 3
      advanceRepetitionItem('q1', true); // 3 -> 7
      advanceRepetitionItem('q1', true); // 7 -> 14

      const queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(14);
    });

    it('advances interval from 14 to 30 days on correct answer', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true); // 1 -> 3
      advanceRepetitionItem('q1', true); // 3 -> 7
      advanceRepetitionItem('q1', true); // 7 -> 14
      advanceRepetitionItem('q1', true); // 14 -> 30

      const queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(30);
    });

    it('removes from queue when advancing past 30 days (mastered)', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true); // 1 -> 3
      advanceRepetitionItem('q1', true); // 3 -> 7
      advanceRepetitionItem('q1', true); // 7 -> 14
      advanceRepetitionItem('q1', true); // 14 -> 30
      advanceRepetitionItem('q1', true); // 30 -> mastered (removed)

      const queue = getRepetitionQueue();
      expect(queue).toHaveLength(0);
    });

    it('increments mastered count when item completes all intervals', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true); // 1 -> 3
      advanceRepetitionItem('q1', true); // 3 -> 7
      advanceRepetitionItem('q1', true); // 7 -> 14
      advanceRepetitionItem('q1', true); // 14 -> 30
      advanceRepetitionItem('q1', true); // mastered

      const stats = getRepetitionStats();
      expect(stats.mastered).toBe(1);
    });

    it('resets interval to 1 on wrong answer', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true); // 1 -> 3
      advanceRepetitionItem('q1', true); // 3 -> 7
      advanceRepetitionItem('q1', false); // 7 -> reset to 1

      const queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(1);
      expect(queue[0].timesReviewed).toBe(3);

      const expectedDue = new Date('2025-06-16T12:00:00.000Z'); // +1 day
      expect(new Date(queue[0].nextDueDate).getTime()).toBe(expectedDue.getTime());
    });

    it('does nothing if questionId is not in queue', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q-nonexistent', true);

      const queue = getRepetitionQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].interval).toBe(1); // unchanged
    });
  });

  describe('getDueItems', () => {
    it('returns empty array when no items are due', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      // Item is due tomorrow, not today
      expect(getDueItems()).toHaveLength(0);
    });

    it('returns items whose nextDueDate is in the past', () => {
      // Manually set an item with past due date
      const pastDueItem: SpacedRepetitionItem = {
        questionId: 'q1',
        interval: 1,
        nextDueDate: '2025-06-14T12:00:00.000Z', // yesterday
        timesReviewed: 0,
        lastReviewedAt: '2025-06-13T12:00:00.000Z',
        originAttemptId: 'attempt-1',
      };
      localStorageMock.setItem('cfa-buddy-spaced-rep', JSON.stringify([pastDueItem]));

      const due = getDueItems();
      expect(due).toHaveLength(1);
      expect(due[0].questionId).toBe('q1');
    });

    it('returns items due exactly now', () => {
      const nowItem: SpacedRepetitionItem = {
        questionId: 'q1',
        interval: 1,
        nextDueDate: '2025-06-15T12:00:00.000Z', // exactly now
        timesReviewed: 0,
        lastReviewedAt: '2025-06-14T12:00:00.000Z',
        originAttemptId: 'attempt-1',
      };
      localStorageMock.setItem('cfa-buddy-spaced-rep', JSON.stringify([nowItem]));

      const due = getDueItems();
      expect(due).toHaveLength(1);
    });

    it('does not return items due in the future', () => {
      const futureItem: SpacedRepetitionItem = {
        questionId: 'q1',
        interval: 3,
        nextDueDate: '2025-06-20T12:00:00.000Z', // 5 days in future
        timesReviewed: 1,
        lastReviewedAt: '2025-06-15T12:00:00.000Z',
        originAttemptId: 'attempt-1',
      };
      localStorageMock.setItem('cfa-buddy-spaced-rep', JSON.stringify([futureItem]));

      expect(getDueItems()).toHaveLength(0);
    });
  });

  describe('getRepetitionStats', () => {
    it('returns zeros when queue is empty', () => {
      const stats = getRepetitionStats();
      expect(stats.total).toBe(0);
      expect(stats.dueToday).toBe(0);
      expect(stats.mastered).toBe(0);
    });

    it('correctly counts total items in queue', () => {
      addToRepetitionQueue('q1', 'attempt-1');
      addToRepetitionQueue('q2', 'attempt-1');
      addToRepetitionQueue('q3', 'attempt-1');

      const stats = getRepetitionStats();
      expect(stats.total).toBe(3);
    });

    it('correctly counts due items', () => {
      const items: SpacedRepetitionItem[] = [
        {
          questionId: 'q1',
          interval: 1,
          nextDueDate: '2025-06-14T12:00:00.000Z', // past due
          timesReviewed: 0,
          lastReviewedAt: '2025-06-13T12:00:00.000Z',
          originAttemptId: 'attempt-1',
        },
        {
          questionId: 'q2',
          interval: 3,
          nextDueDate: '2025-06-20T12:00:00.000Z', // future
          timesReviewed: 1,
          lastReviewedAt: '2025-06-15T12:00:00.000Z',
          originAttemptId: 'attempt-1',
        },
      ];
      localStorageMock.setItem('cfa-buddy-spaced-rep', JSON.stringify(items));

      const stats = getRepetitionStats();
      expect(stats.total).toBe(2);
      expect(stats.dueToday).toBe(1);
    });

    it('tracks mastered count across multiple items', () => {
      // Master two items
      addToRepetitionQueue('q1', 'attempt-1');
      advanceRepetitionItem('q1', true); // 1->3
      advanceRepetitionItem('q1', true); // 3->7
      advanceRepetitionItem('q1', true); // 7->14
      advanceRepetitionItem('q1', true); // 14->30
      advanceRepetitionItem('q1', true); // mastered

      addToRepetitionQueue('q2', 'attempt-1');
      advanceRepetitionItem('q2', true); // 1->3
      advanceRepetitionItem('q2', true); // 3->7
      advanceRepetitionItem('q2', true); // 7->14
      advanceRepetitionItem('q2', true); // 14->30
      advanceRepetitionItem('q2', true); // mastered

      const stats = getRepetitionStats();
      expect(stats.mastered).toBe(2);
      expect(stats.total).toBe(0);
    });
  });

  describe('full lifecycle', () => {
    it('simulates a question going through all stages to mastery', () => {
      // Add incorrect question
      addToRepetitionQueue('q-lifecycle', 'attempt-1');
      expect(getRepetitionStats().total).toBe(1);

      // Day 1: review correctly
      vi.setSystemTime(new Date('2025-06-16T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', true); // 1->3
      let queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(3);

      // Day 4 (3 days later): review correctly
      vi.setSystemTime(new Date('2025-06-19T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', true); // 3->7
      queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(7);

      // Day 11 (7 days later): get it wrong -> reset
      vi.setSystemTime(new Date('2025-06-26T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', false); // 7->1 (reset)
      queue = getRepetitionQueue();
      expect(queue[0].interval).toBe(1);

      // Day 12: review correctly again
      vi.setSystemTime(new Date('2025-06-27T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', true); // 1->3

      // Continue advancing to mastery
      vi.setSystemTime(new Date('2025-06-30T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', true); // 3->7
      vi.setSystemTime(new Date('2025-07-07T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', true); // 7->14
      vi.setSystemTime(new Date('2025-07-21T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', true); // 14->30
      vi.setSystemTime(new Date('2025-08-20T12:00:00Z'));
      advanceRepetitionItem('q-lifecycle', true); // 30->mastered

      expect(getRepetitionQueue()).toHaveLength(0);
      expect(getRepetitionStats().mastered).toBe(1);
    });
  });
});
