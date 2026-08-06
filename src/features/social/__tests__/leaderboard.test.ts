import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateLeaderboard } from '../utils/leaderboard';

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

describe('leaderboard', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('calculateLeaderboard', () => {
    it('returns up to 20 entries when sorted by accuracy', () => {
      const entries = calculateLeaderboard('accuracy', null);
      expect(entries.length).toBeLessThanOrEqual(20);
      expect(entries.length).toBeGreaterThan(0);
    });

    it('sorts entries by accuracy in descending order', () => {
      const entries = calculateLeaderboard('accuracy', null);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].accuracy).toBeGreaterThanOrEqual(entries[i].accuracy);
      }
    });

    it('sorts entries by streak in descending order', () => {
      const entries = calculateLeaderboard('streak', null);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].streakDays).toBeGreaterThanOrEqual(entries[i].streakDays);
      }
    });

    it('sorts entries by questions in descending order', () => {
      const entries = calculateLeaderboard('questions', null);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].questionsCompleted).toBeGreaterThanOrEqual(entries[i].questionsCompleted);
      }
    });

    it('includes current user when provided', () => {
      const currentUser = {
        displayName: 'Test User',
        accuracy: 95,
        streakDays: 50,
        questionsCompleted: 3000,
        level: 20,
      };
      const entries = calculateLeaderboard('accuracy', currentUser);
      const userEntry = entries.find((e) => e.isCurrentUser);
      expect(userEntry).toBeDefined();
      expect(userEntry?.displayName).toBe('Test User');
      expect(userEntry?.accuracy).toBe(95);
    });

    it('marks current user entry with isCurrentUser flag', () => {
      const currentUser = {
        displayName: 'Me',
        accuracy: 80,
        streakDays: 10,
        questionsCompleted: 500,
        level: 7,
      };
      const entries = calculateLeaderboard('accuracy', currentUser);
      const currentUserEntries = entries.filter((e) => e.isCurrentUser);
      expect(currentUserEntries.length).toBe(1);
    });

    it('does not include current user entry when null', () => {
      const entries = calculateLeaderboard('accuracy', null);
      const currentUserEntries = entries.filter((e) => e.isCurrentUser);
      expect(currentUserEntries.length).toBe(0);
    });

    it('current user with high accuracy ranks at the top', () => {
      const currentUser = {
        displayName: 'Top User',
        accuracy: 99,
        streakDays: 100,
        questionsCompleted: 10000,
        level: 30,
      };
      const entries = calculateLeaderboard('accuracy', currentUser);
      expect(entries[0].isCurrentUser).toBe(true);
      expect(entries[0].displayName).toBe('Top User');
    });

    it('saves leaderboard to localStorage cache', () => {
      calculateLeaderboard('accuracy', null);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cfa-buddy-leaderboard',
        expect.any(String)
      );
    });

    it('each entry has required fields', () => {
      const entries = calculateLeaderboard('accuracy', null);
      for (const entry of entries) {
        expect(entry.id).toBeDefined();
        expect(entry.displayName).toBeDefined();
        expect(entry.avatarColor).toBeDefined();
        expect(typeof entry.accuracy).toBe('number');
        expect(typeof entry.streakDays).toBe('number');
        expect(typeof entry.questionsCompleted).toBe('number');
        expect(typeof entry.level).toBe('number');
        expect(typeof entry.isCurrentUser).toBe('boolean');
      }
    });
  });
});
