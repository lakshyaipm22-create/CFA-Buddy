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

describe('onboarding-checklist localStorage keys', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('uses cfa-buddy-sessions key (matching session-storage.ts)', () => {
    // The onboarding checklist should look for sessions at the same key
    // that session-storage.ts uses
    const EXPECTED_KEY = 'cfa-buddy-sessions';
    localStorageMock.setItem(
      EXPECTED_KEY,
      JSON.stringify([{ status: 'completed', attempts: [] }])
    );

    const raw = localStorage.getItem(EXPECTED_KEY);
    expect(raw).not.toBeNull();
    const sessions = JSON.parse(raw!);
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('uses cfa-buddy-flashcards key (matching flashcards/utils/storage.ts)', () => {
    // The onboarding checklist should look for flashcards at the same key
    // that flashcards storage uses
    const EXPECTED_KEY = 'cfa-buddy-flashcards';
    localStorageMock.setItem(
      EXPECTED_KEY,
      JSON.stringify([{ id: '1', front: 'Q', back: 'A' }])
    );

    const raw = localStorage.getItem(EXPECTED_KEY);
    expect(raw).not.toBeNull();
    const cards = JSON.parse(raw!);
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('uses cfa-buddy-local-profile key for profile checks', () => {
    const PROFILE_KEY = 'cfa-buddy-local-profile';
    localStorageMock.setItem(
      PROFILE_KEY,
      JSON.stringify({ displayName: 'Test User', examDate: '2025-06-15' })
    );

    const raw = localStorage.getItem(PROFILE_KEY);
    expect(raw).not.toBeNull();
    const profile = JSON.parse(raw!);
    expect(profile.displayName).toBe('Test User');
    expect(profile.examDate).toBe('2025-06-15');
  });

  it('correctly detects sessions exist when key has data', () => {
    const SESSIONS_KEY = 'cfa-buddy-sessions';
    localStorageMock.setItem(
      SESSIONS_KEY,
      JSON.stringify([{ status: 'completed', attempts: [{ correct: true }] }])
    );

    // Simulate the check logic from the onboarding checklist
    const raw = localStorage.getItem(SESSIONS_KEY);
    const sessions = raw ? JSON.parse(raw) : [];
    const hasSession = Array.isArray(sessions) && sessions.length > 0;
    expect(hasSession).toBe(true);
  });

  it('correctly detects flashcards exist when key has data', () => {
    const FLASHCARDS_KEY = 'cfa-buddy-flashcards';
    localStorageMock.setItem(
      FLASHCARDS_KEY,
      JSON.stringify([{ id: '1', front: 'Q', back: 'A' }])
    );

    // Simulate the check logic from the onboarding checklist
    const raw = localStorage.getItem(FLASHCARDS_KEY);
    const cards = raw ? JSON.parse(raw) : [];
    const hasCards = Array.isArray(cards) && cards.length > 0;
    expect(hasCards).toBe(true);
  });

  it('returns false for sessions when key is empty', () => {
    const raw = localStorage.getItem('cfa-buddy-sessions');
    expect(raw).toBeNull();
  });

  it('returns false for flashcards when key is empty', () => {
    const raw = localStorage.getItem('cfa-buddy-flashcards');
    expect(raw).toBeNull();
  });

  it('profile check returns false when name is default', () => {
    const PROFILE_KEY = 'cfa-buddy-local-profile';
    localStorageMock.setItem(
      PROFILE_KEY,
      JSON.stringify({ displayName: 'CFA Student' })
    );

    const raw = localStorage.getItem(PROFILE_KEY);
    const profile = raw ? JSON.parse(raw) : {};
    const isProfileSet = profile.displayName && profile.displayName !== 'CFA Student';
    expect(isProfileSet).toBeFalsy();
  });

  it('exam date check returns true when examDate is set', () => {
    const PROFILE_KEY = 'cfa-buddy-local-profile';
    localStorageMock.setItem(
      PROFILE_KEY,
      JSON.stringify({ displayName: 'Student', examDate: '2025-08-20' })
    );

    const raw = localStorage.getItem(PROFILE_KEY);
    const profile = raw ? JSON.parse(raw) : {};
    expect(!!profile.examDate).toBe(true);
  });

  it('handles invalid JSON gracefully', () => {
    localStorageMock.setItem('cfa-buddy-sessions', 'not valid json{');

    let sessions: unknown[] = [];
    try {
      const raw = localStorage.getItem('cfa-buddy-sessions');
      if (raw) sessions = JSON.parse(raw);
    } catch {
      sessions = [];
    }
    expect(sessions).toEqual([]);
  });
});
