import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordPageVisit, getRecentPages, hasVisitedPage } from '../lib/page-visit-tracker';

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

describe('page-visit-tracker', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getRecentPages', () => {
    it('returns empty array when no data exists', () => {
      expect(getRecentPages()).toEqual([]);
    });

    it('returns stored page visits', () => {
      localStorageMock.setItem(
        'cfa-buddy-recent-pages',
        JSON.stringify([
          { path: '/questions', title: 'Questions', timestamp: '2025-01-15T10:00:00Z' },
          { path: '/flashcards', title: 'Flashcards', timestamp: '2025-01-15T09:00:00Z' },
        ])
      );

      const pages = getRecentPages();
      expect(pages).toHaveLength(2);
      expect(pages[0].path).toBe('/questions');
      expect(pages[1].path).toBe('/flashcards');
    });

    it('handles corrupted JSON gracefully', () => {
      localStorageMock.setItem('cfa-buddy-recent-pages', 'not valid');
      expect(getRecentPages()).toEqual([]);
    });
  });

  describe('recordPageVisit', () => {
    it('stores a new page visit', () => {
      recordPageVisit('/questions', 'Questions');

      const pages = getRecentPages();
      expect(pages).toHaveLength(1);
      expect(pages[0].path).toBe('/questions');
      expect(pages[0].title).toBe('Questions');
      expect(pages[0].timestamp).toBeDefined();
    });

    it('deduplicates by path (moves existing to front)', () => {
      recordPageVisit('/flashcards', 'Flashcards');
      recordPageVisit('/questions', 'Questions');
      recordPageVisit('/flashcards', 'Flashcards');

      const pages = getRecentPages();
      expect(pages).toHaveLength(2);
      expect(pages[0].path).toBe('/flashcards');
      expect(pages[1].path).toBe('/questions');
    });

    it('limits to 10 entries maximum', () => {
      for (let i = 0; i < 15; i++) {
        recordPageVisit(`/page-${i}`, `Page ${i}`);
      }

      const pages = getRecentPages();
      expect(pages).toHaveLength(10);
      // Most recent should be first
      expect(pages[0].path).toBe('/page-14');
    });
  });

  describe('hasVisitedPage', () => {
    it('returns false when page not visited', () => {
      expect(hasVisitedPage('/questions/attempts')).toBe(false);
    });

    it('returns true when page has been visited', () => {
      recordPageVisit('/questions/attempts', 'Attempts');
      expect(hasVisitedPage('/questions/attempts')).toBe(true);
    });

    it('checks startsWith for attempt tracking in onboarding', () => {
      // The onboarding checklist checks: pages.some(p => p.path.startsWith('/questions/attempts'))
      recordPageVisit('/questions/attempts/abc123', 'Attempt Detail');

      const pages = getRecentPages();
      const hasVisitedAttempts = pages.some(p => p.path.startsWith('/questions/attempts'));
      expect(hasVisitedAttempts).toBe(true);
    });
  });
});
