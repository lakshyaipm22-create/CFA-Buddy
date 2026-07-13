import { describe, it, expect } from 'vitest';
import {
  computeSessionStats,
  computeAggregateStats,
  filterSessions,
  sortSessions,
} from '../utils/analytics-engine';
import type { QuestionSession, QuestionAttempt } from '@/features/question-bank/types';
import type { AnalyticsSession, SessionFilter } from '../types';

// ---------- Mock Data Helpers ----------

function createMockAttempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    questionId: `q-${Math.random().toString(36).slice(2, 8)}`,
    selectedAnswer: 'A',
    confidence: 'Certain',
    timeSpentSeconds: 45,
    correct: true,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function createMockSession(overrides: Partial<QuestionSession> = {}): QuestionSession {
  const id = overrides.id ?? `session-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    mode: 'Topic',
    config: {
      questionCount: 10,
      timeLimit: null,
      subject: 'Ethics',
      topic: 'Standards of Practice',
      ...overrides.config,
    },
    status: 'completed',
    startedAt: '2025-01-15T10:00:00.000Z',
    completedAt: '2025-01-15T10:30:00.000Z',
    questionIds: [],
    attempts: [],
    currentIndex: 0,
    flaggedIds: [],
    bookmarkedIds: [],
    expiresAt: '2025-01-16T10:00:00.000Z',
    ...overrides,
  };
}

function createMockAnalyticsSession(overrides: Partial<AnalyticsSession> = {}): AnalyticsSession {
  return {
    id: `session-${Math.random().toString(36).slice(2, 8)}`,
    mode: 'Topic',
    subject: 'Ethics',
    topic: 'Standards of Practice',
    startedAt: '2025-01-15T10:00:00.000Z',
    completedAt: '2025-01-15T10:30:00.000Z',
    totalQuestions: 10,
    correctAnswers: 7,
    accuracy: 70,
    durationSeconds: 1800,
    confidenceBreakdown: { certain: 6, certainCorrect: 5, thinkSo: 3, guess: 2, total: 10 },
    isTimed: false,
    confidenceMatrix: {
      mastered: 5,
      solid: 1,
      luckyGuess: 1,
      misconception: 1,
      weakArea: 1,
      knowledgeGap: 1,
    },
    ...overrides,
  };
}

// ---------- computeSessionStats ----------

describe('computeSessionStats', () => {
  it('computes basic stats from a session with attempts', () => {
    const session = createMockSession({
      startedAt: '2025-01-15T10:00:00.000Z',
      completedAt: '2025-01-15T10:10:00.000Z',
      attempts: [
        createMockAttempt({ correct: true, confidence: 'Certain', timeSpentSeconds: 30 }),
        createMockAttempt({ correct: true, confidence: 'ThinkSo', timeSpentSeconds: 40 }),
        createMockAttempt({ correct: false, confidence: 'Guess', timeSpentSeconds: 20 }),
        createMockAttempt({ correct: false, confidence: 'Certain', timeSpentSeconds: 50 }),
        createMockAttempt({ correct: true, confidence: 'Guess', timeSpentSeconds: 25 }),
      ],
    });

    const result = computeSessionStats(session);

    expect(result.totalQuestions).toBe(5);
    expect(result.correctAnswers).toBe(3);
    expect(result.accuracy).toBeCloseTo(60, 1);
    expect(result.durationSeconds).toBe(600); // 10 minutes
    expect(result.mode).toBe('Topic');
    expect(result.subject).toBe('Ethics');
    expect(result.topic).toBe('Standards of Practice');
    expect(result.isTimed).toBe(false);
  });

  it('handles session with no attempts (empty)', () => {
    const session = createMockSession({
      startedAt: '2025-01-15T10:00:00.000Z',
      completedAt: '2025-01-15T10:05:00.000Z',
      attempts: [],
    });

    const result = computeSessionStats(session);

    expect(result.totalQuestions).toBe(0);
    expect(result.correctAnswers).toBe(0);
    expect(result.accuracy).toBe(0);
    expect(result.durationSeconds).toBe(300);
  });

  it('uses time spent sum when no completedAt', () => {
    const session = createMockSession({
      startedAt: '2025-01-15T10:00:00.000Z',
      completedAt: null,
      attempts: [
        createMockAttempt({ timeSpentSeconds: 30 }),
        createMockAttempt({ timeSpentSeconds: 45 }),
        createMockAttempt({ timeSpentSeconds: 60 }),
      ],
    });

    const result = computeSessionStats(session);
    expect(result.durationSeconds).toBe(135);
  });

  it('correctly computes confidence breakdown', () => {
    const session = createMockSession({
      attempts: [
        createMockAttempt({ correct: true, confidence: 'Certain' }),
        createMockAttempt({ correct: true, confidence: 'Certain' }),
        createMockAttempt({ correct: false, confidence: 'Certain' }),
        createMockAttempt({ correct: true, confidence: 'ThinkSo' }),
        createMockAttempt({ correct: false, confidence: 'Guess' }),
        createMockAttempt({ correct: true, confidence: 'Guess' }),
      ],
    });

    const result = computeSessionStats(session);

    expect(result.confidenceBreakdown.certain).toBe(3);
    expect(result.confidenceBreakdown.certainCorrect).toBe(2);
    expect(result.confidenceBreakdown.thinkSo).toBe(1);
    expect(result.confidenceBreakdown.guess).toBe(2);
    expect(result.confidenceBreakdown.total).toBe(6);
  });

  it('correctly computes confidence matrix', () => {
    const session = createMockSession({
      attempts: [
        createMockAttempt({ correct: true, confidence: 'Certain' }), // mastered
        createMockAttempt({ correct: true, confidence: 'ThinkSo' }), // solid
        createMockAttempt({ correct: true, confidence: 'Guess' }), // luckyGuess
        createMockAttempt({ correct: false, confidence: 'Certain' }), // misconception
        createMockAttempt({ correct: false, confidence: 'ThinkSo' }), // weakArea
        createMockAttempt({ correct: false, confidence: 'Guess' }), // knowledgeGap
      ],
    });

    const result = computeSessionStats(session);

    expect(result.confidenceMatrix.mastered).toBe(1);
    expect(result.confidenceMatrix.solid).toBe(1);
    expect(result.confidenceMatrix.luckyGuess).toBe(1);
    expect(result.confidenceMatrix.misconception).toBe(1);
    expect(result.confidenceMatrix.weakArea).toBe(1);
    expect(result.confidenceMatrix.knowledgeGap).toBe(1);
  });

  it('detects timed session', () => {
    const session = createMockSession({
      config: { questionCount: 10, timeLimit: 30, subject: 'Ethics' },
      attempts: [createMockAttempt()],
    });

    const result = computeSessionStats(session);
    expect(result.isTimed).toBe(true);
  });

  it('detects untimed session when timeLimit is null', () => {
    const session = createMockSession({
      config: { questionCount: 10, timeLimit: null, subject: 'Ethics' },
      attempts: [createMockAttempt()],
    });

    const result = computeSessionStats(session);
    expect(result.isTimed).toBe(false);
  });

  it('detects untimed session when timeLimit is 0', () => {
    const session = createMockSession({
      config: { questionCount: 10, timeLimit: 0, subject: 'Ethics' },
      attempts: [createMockAttempt()],
    });

    const result = computeSessionStats(session);
    expect(result.isTimed).toBe(false);
  });

  it('handles session with null subject/topic in config', () => {
    const session = createMockSession({
      config: { questionCount: 10, timeLimit: null },
      attempts: [createMockAttempt()],
    });

    const result = computeSessionStats(session);
    expect(result.subject).toBeNull();
    expect(result.topic).toBeNull();
  });
});

// ---------- computeAggregateStats ----------

describe('computeAggregateStats', () => {
  it('returns zero stats for empty sessions array', () => {
    const result = computeAggregateStats([]);

    expect(result.totalSessions).toBe(0);
    expect(result.totalQuestions).toBe(0);
    expect(result.overallAccuracy).toBe(0);
    expect(result.averageDurationSeconds).toBe(0);
    expect(result.bestScore).toBeNull();
    expect(result.accuracyTrend).toBe('flat');
    expect(result.totalStudyTimeSeconds).toBe(0);
  });

  it('computes aggregate stats from single session', () => {
    const sessions = [
      createMockAnalyticsSession({
        totalQuestions: 10,
        correctAnswers: 8,
        accuracy: 80,
        durationSeconds: 600,
      }),
    ];

    const result = computeAggregateStats(sessions);

    expect(result.totalSessions).toBe(1);
    expect(result.totalQuestions).toBe(10);
    expect(result.overallAccuracy).toBe(80);
    expect(result.averageDurationSeconds).toBe(600);
    expect(result.bestScore).toEqual({ accuracy: 80, date: '2025-01-15T10:30:00.000Z' });
    expect(result.totalStudyTimeSeconds).toBe(600);
  });

  it('computes aggregate stats from multiple sessions', () => {
    const sessions = [
      createMockAnalyticsSession({
        totalQuestions: 10,
        correctAnswers: 8,
        accuracy: 80,
        durationSeconds: 600,
        completedAt: '2025-01-15T10:30:00.000Z',
      }),
      createMockAnalyticsSession({
        totalQuestions: 20,
        correctAnswers: 12,
        accuracy: 60,
        durationSeconds: 1200,
        completedAt: '2025-01-16T10:30:00.000Z',
      }),
      createMockAnalyticsSession({
        totalQuestions: 5,
        correctAnswers: 5,
        accuracy: 100,
        durationSeconds: 300,
        completedAt: '2025-01-17T10:30:00.000Z',
      }),
    ];

    const result = computeAggregateStats(sessions);

    expect(result.totalSessions).toBe(3);
    expect(result.totalQuestions).toBe(35);
    // (8+12+5) / 35 * 100 = 71.43%
    expect(result.overallAccuracy).toBeCloseTo(71.43, 1);
    expect(result.averageDurationSeconds).toBe(700); // (600+1200+300)/3 = 700
    expect(result.bestScore?.accuracy).toBe(100);
    expect(result.totalStudyTimeSeconds).toBe(2100);
  });

  it('identifies the best score correctly', () => {
    const sessions = [
      createMockAnalyticsSession({ accuracy: 50, totalQuestions: 10, completedAt: '2025-01-10T10:00:00.000Z' }),
      createMockAnalyticsSession({ accuracy: 90, totalQuestions: 10, completedAt: '2025-01-11T10:00:00.000Z' }),
      createMockAnalyticsSession({ accuracy: 75, totalQuestions: 10, completedAt: '2025-01-12T10:00:00.000Z' }),
    ];

    const result = computeAggregateStats(sessions);
    expect(result.bestScore?.accuracy).toBe(90);
    expect(result.bestScore?.date).toBe('2025-01-11T10:00:00.000Z');
  });
});

// ---------- filterSessions ----------

describe('filterSessions', () => {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();

  const sessions: AnalyticsSession[] = [
    createMockAnalyticsSession({ id: 'recent', startedAt: threeDaysAgo, subject: 'Ethics', mode: 'Topic', accuracy: 85 }),
    createMockAnalyticsSession({ id: 'medium', startedAt: tenDaysAgo, subject: 'Quant', mode: 'Mixed', accuracy: 65 }),
    createMockAnalyticsSession({ id: 'old', startedAt: fortyDaysAgo, subject: 'Ethics', mode: 'Mock', accuracy: 45 }),
  ];

  it('returns all sessions with default filter', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: null, mode: null, scoreRange: 'all' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(3);
  });

  it('filters by 7-day date range', () => {
    const filter: SessionFilter = { dateRange: '7d', subject: null, mode: null, scoreRange: 'all' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('recent');
  });

  it('filters by 30-day date range', () => {
    const filter: SessionFilter = { dateRange: '30d', subject: null, mode: null, scoreRange: 'all' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).toContain('recent');
    expect(result.map(s => s.id)).toContain('medium');
  });

  it('filters by subject', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: 'Ethics', mode: null, scoreRange: 'all' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(2);
    expect(result.every(s => s.subject === 'Ethics')).toBe(true);
  });

  it('filters by mode', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: null, mode: 'Mock', scoreRange: 'all' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(1);
    expect(result[0].mode).toBe('Mock');
  });

  it('filters by score range below60', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: null, mode: null, scoreRange: 'below60' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(1);
    expect(result[0].accuracy).toBeLessThan(60);
  });

  it('filters by score range 60to80', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: null, mode: null, scoreRange: '60to80' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(1);
    expect(result[0].accuracy).toBeGreaterThanOrEqual(60);
    expect(result[0].accuracy).toBeLessThanOrEqual(80);
  });

  it('filters by score range above80', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: null, mode: null, scoreRange: 'above80' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(1);
    expect(result[0].accuracy).toBeGreaterThan(80);
  });

  it('combines multiple filters', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: 'Ethics', mode: null, scoreRange: 'above80' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('recent');
  });

  it('returns empty when no sessions match', () => {
    const filter: SessionFilter = { dateRange: '7d', subject: 'Quant', mode: null, scoreRange: 'all' };
    const result = filterSessions(sessions, filter);
    expect(result).toHaveLength(0);
  });

  it('handles empty sessions array', () => {
    const filter: SessionFilter = { dateRange: 'all', subject: null, mode: null, scoreRange: 'all' };
    const result = filterSessions([], filter);
    expect(result).toHaveLength(0);
  });
});

// ---------- sortSessions ----------

describe('sortSessions', () => {
  const sessions: AnalyticsSession[] = [
    createMockAnalyticsSession({ id: 'a', startedAt: '2025-01-10T10:00:00.000Z', accuracy: 70, durationSeconds: 300 }),
    createMockAnalyticsSession({ id: 'b', startedAt: '2025-01-15T10:00:00.000Z', accuracy: 90, durationSeconds: 600 }),
    createMockAnalyticsSession({ id: 'c', startedAt: '2025-01-12T10:00:00.000Z', accuracy: 50, durationSeconds: 1200 }),
  ];

  it('sorts by date (newest first)', () => {
    const result = sortSessions(sessions, 'date');
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('c');
    expect(result[2].id).toBe('a');
  });

  it('sorts by score (highest first)', () => {
    const result = sortSessions(sessions, 'score');
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
    expect(result[2].id).toBe('c');
  });

  it('sorts by duration (longest first)', () => {
    const result = sortSessions(sessions, 'duration');
    expect(result[0].id).toBe('c');
    expect(result[1].id).toBe('b');
    expect(result[2].id).toBe('a');
  });

  it('does not mutate the original array', () => {
    const original = [...sessions];
    sortSessions(sessions, 'score');
    expect(sessions).toEqual(original);
  });

  it('handles empty array', () => {
    const result = sortSessions([], 'date');
    expect(result).toHaveLength(0);
  });

  it('handles single session', () => {
    const single = [createMockAnalyticsSession({ id: 'only' })];
    const result = sortSessions(single, 'score');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('only');
  });
});
