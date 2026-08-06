import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectNewAchievements, ensureSimulatedActivity } from '../utils/achievements';
import type { GamificationState } from '@/features/gamification/types';

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

function createGamificationState(overrides: Partial<GamificationState> = {}): GamificationState {
  return {
    xp: 0,
    level: 0,
    streakDays: 0,
    lastActivityDate: '',
    weeklyQuestionsAnswered: 0,
    weekStartDate: '2025-01-06',
    badges: [],
    dailyCounts: {},
    ...overrides,
  };
}

describe('achievements', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('detectNewAchievements', () => {
    it('detects no achievements for fresh state', () => {
      const state = createGamificationState();
      const achievements = detectNewAchievements(state);
      expect(achievements).toEqual([]);
    });

    it('detects question milestone at 50 questions', () => {
      const dailyCounts: Record<string, number> = {};
      for (let i = 1; i <= 5; i++) {
        dailyCounts[`2025-01-${String(i).padStart(2, '0')}`] = 10;
      }
      const state = createGamificationState({ dailyCounts });
      const achievements = detectNewAchievements(state);
      expect(achievements.some((a) => a.id === 'questions-50')).toBe(true);
    });

    it('detects question milestone at 100 questions', () => {
      const dailyCounts: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) {
        dailyCounts[`2025-01-${String(i).padStart(2, '0')}`] = 10;
      }
      const state = createGamificationState({ dailyCounts });
      const achievements = detectNewAchievements(state);
      expect(achievements.some((a) => a.id === 'questions-100')).toBe(true);
    });

    it('detects streak milestone at 7 days', () => {
      const state = createGamificationState({ streakDays: 7 });
      const achievements = detectNewAchievements(state);
      expect(achievements.some((a) => a.id === 'streak-7')).toBe(true);
      expect(achievements.some((a) => a.id === 'streak-3')).toBe(true);
    });

    it('detects streak milestone at 30 days', () => {
      const state = createGamificationState({ streakDays: 30 });
      const achievements = detectNewAchievements(state);
      expect(achievements.some((a) => a.id === 'streak-30')).toBe(true);
    });

    it('detects level milestone at level 5', () => {
      const state = createGamificationState({ level: 5 });
      const achievements = detectNewAchievements(state);
      expect(achievements.some((a) => a.id === 'level-5')).toBe(true);
    });

    it('detects level milestone at level 10', () => {
      const state = createGamificationState({ level: 10 });
      const achievements = detectNewAchievements(state);
      expect(achievements.some((a) => a.id === 'level-10')).toBe(true);
      expect(achievements.some((a) => a.id === 'level-5')).toBe(true);
    });

    it('detects badge milestone when 1 badge is earned', () => {
      const state = createGamificationState({
        badges: [
          { id: 'test', name: 'Test', description: 'Test badge', icon: 'star', earnedAt: '2025-01-01' },
        ],
      });
      const achievements = detectNewAchievements(state);
      expect(achievements.some((a) => a.id === 'badges-1')).toBe(true);
    });

    it('does not duplicate already detected achievements', () => {
      const state = createGamificationState({ streakDays: 7 });

      // First detection
      const first = detectNewAchievements(state);
      expect(first.some((a) => a.id === 'streak-7')).toBe(true);

      // Second detection should not return the same achievements
      const second = detectNewAchievements(state);
      expect(second.some((a) => a.id === 'streak-7')).toBe(false);
    });

    it('detects multiple milestones at once', () => {
      const dailyCounts: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) {
        dailyCounts[`2025-01-${String(i).padStart(2, '0')}`] = 10;
      }
      const state = createGamificationState({
        dailyCounts,
        streakDays: 14,
        level: 10,
      });
      const achievements = detectNewAchievements(state);
      // Should detect: questions-50, questions-100, streak-3, streak-7, streak-14, level-5, level-10
      expect(achievements.length).toBeGreaterThanOrEqual(5);
    });

    it('saves detected achievement IDs to localStorage', () => {
      const state = createGamificationState({ streakDays: 7 });
      detectNewAchievements(state);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'cfa-buddy-achievements-detected',
        expect.any(String)
      );
    });
  });

  describe('ensureSimulatedActivity', () => {
    it('generates simulated activity when feed is empty', () => {
      const items = ensureSimulatedActivity();
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(20);
    });

    it('returns existing feed items when feed is not empty', () => {
      const existing = [
        {
          id: 'existing-1',
          userId: 'user-1',
          displayName: 'User',
          avatarColor: '#fff',
          type: 'level_up',
          description: 'Test',
          timestamp: new Date().toISOString(),
        },
      ];
      localStorageMock.setItem('cfa-buddy-activity-feed', JSON.stringify(existing));
      vi.clearAllMocks();

      const items = ensureSimulatedActivity();
      expect(items).toEqual(existing);
    });

    it('simulated items have valid structure', () => {
      const items = ensureSimulatedActivity();
      for (const item of items) {
        expect(item.id).toBeDefined();
        expect(item.userId).toBeDefined();
        expect(item.displayName).toBeDefined();
        expect(item.avatarColor).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.timestamp).toBeDefined();
      }
    });
  });
});
