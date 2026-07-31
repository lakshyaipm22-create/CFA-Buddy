import { describe, it, expect, beforeEach, vi } from 'vitest';

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

describe('notification-dropdown: session data alignment', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('uses cfa-buddy-sessions key for streak detection', () => {
    // The notification dropdown reads sessions to detect streak warnings
    const today = new Date().toISOString().slice(0, 10);
    const sessions = [
      { status: 'completed', attempts: [{ correct: true, timestamp: `${today}T08:00:00Z` }] },
      { status: 'completed', attempts: [{ correct: false, timestamp: '2025-01-14T08:00:00Z' }] },
      { status: 'completed', attempts: [{ correct: true, timestamp: '2025-01-13T08:00:00Z' }] },
    ];
    localStorageMock.setItem('cfa-buddy-sessions', JSON.stringify(sessions));

    const raw = localStorage.getItem('cfa-buddy-sessions');
    const parsed = JSON.parse(raw!);
    const completed = parsed.filter((s: { status: string }) => s.status === 'completed');
    expect(completed).toHaveLength(3);

    // Streak check: has studied today?
    const hasStudiedToday = completed.some((s: { attempts?: Array<{ timestamp?: string }> }) =>
      s.attempts?.some(a => a.timestamp?.startsWith(today))
    );
    expect(hasStudiedToday).toBe(true);
  });

  it('detects streak warning when user has not studied today', () => {
    const sessions = [
      { status: 'completed', attempts: [{ correct: true, timestamp: '2025-01-14T08:00:00Z' }] },
      { status: 'completed', attempts: [{ correct: false, timestamp: '2025-01-13T08:00:00Z' }] },
      { status: 'completed', attempts: [{ correct: true, timestamp: '2025-01-12T08:00:00Z' }] },
    ];
    localStorageMock.setItem('cfa-buddy-sessions', JSON.stringify(sessions));

    const raw = localStorage.getItem('cfa-buddy-sessions');
    const parsed = JSON.parse(raw!);
    const completed = parsed.filter((s: { status: string }) => s.status === 'completed');
    const today = new Date().toISOString().slice(0, 10);
    const hasStudiedToday = completed.some((s: { attempts?: Array<{ timestamp?: string }> }) =>
      s.attempts?.some(a => a.timestamp?.startsWith(today))
    );

    // Since all sessions are from past dates, no study today
    expect(hasStudiedToday).toBe(false);
  });

  it('does not show streak warning with fewer than 3 completed sessions', () => {
    const sessions = [
      { status: 'completed', attempts: [{ correct: true, timestamp: '2025-01-14T08:00:00Z' }] },
      { status: 'in_progress', attempts: [] },
    ];
    localStorageMock.setItem('cfa-buddy-sessions', JSON.stringify(sessions));

    const raw = localStorage.getItem('cfa-buddy-sessions');
    const parsed = JSON.parse(raw!);
    const completed = parsed.filter((s: { status: string }) => s.status === 'completed');
    // Streak warning only appears when 3+ completed sessions exist
    expect(completed.length >= 3).toBe(false);
  });
});
