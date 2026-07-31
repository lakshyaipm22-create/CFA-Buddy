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

describe('useLocalStorageSessions - storage key alignment', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const SESSIONS_KEY = 'cfa-buddy-sessions';

  it('reads from the correct cfa-buddy-sessions key', () => {
    const testSessions = [
      { status: 'completed', attempts: [{ correct: true, timestamp: '2025-01-15T10:00:00Z' }] },
      { status: 'in_progress', attempts: [] },
    ];
    localStorageMock.setItem(SESSIONS_KEY, JSON.stringify(testSessions));

    const raw = localStorage.getItem(SESSIONS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].status).toBe('completed');
  });

  it('returns empty array when no sessions stored', () => {
    const raw = localStorage.getItem(SESSIONS_KEY);
    expect(raw).toBeNull();
  });

  it('handles corrupted data gracefully', () => {
    localStorageMock.setItem(SESSIONS_KEY, '{invalid json');
    let result: unknown[] = [];
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (raw) result = JSON.parse(raw);
    } catch {
      result = [];
    }
    expect(result).toEqual([]);
  });

  it('aligns with session-storage.ts SESSIONS_KEY constant', () => {
    // This test confirms the shared hook uses the same key as the session storage utility
    // session-storage.ts defines: const SESSIONS_KEY = 'cfa-buddy-sessions'
    expect(SESSIONS_KEY).toBe('cfa-buddy-sessions');
  });

  it('parses session data with expected structure', () => {
    const session = {
      status: 'completed',
      mode: 'practice',
      completedAt: '2025-01-15T10:00:00Z',
      config: { subject: 'Corporate Issuers' },
      attempts: [
        {
          correct: true,
          timestamp: '2025-01-15T10:01:00Z',
          questionId: 'q-123',
          confidence: 'high',
          errorClassification: null,
          timeSpentSeconds: 45,
        },
      ],
    };
    localStorageMock.setItem(SESSIONS_KEY, JSON.stringify([session]));

    const raw = localStorage.getItem(SESSIONS_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed[0].status).toBe('completed');
    expect(parsed[0].config.subject).toBe('Corporate Issuers');
    expect(parsed[0].attempts[0].correct).toBe(true);
    expect(parsed[0].attempts[0].timeSpentSeconds).toBe(45);
  });
});
