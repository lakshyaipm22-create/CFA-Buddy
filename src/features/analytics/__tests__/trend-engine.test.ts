import { describe, it, expect } from 'vitest';
import {
  computeAccuracyTrend,
  computeTimeTrend,
  computeConfidenceCalibration,
  computeSubjectProgression,
  getAccuracyDirection,
} from '../utils/trend-engine';
import type { AnalyticsSession } from '../types';

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

describe('computeAccuracyTrend', () => {
  it('returns empty array for no sessions', () => {
    expect(computeAccuracyTrend([])).toEqual([]);
  });

  it('returns single data point for single session', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 7,
      }),
    ];
    const result = computeAccuracyTrend(sessions);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2025-01-15');
    expect(result[0].value).toBe(70);
    expect(result[0].label).toBe('70%');
  });

  it('groups sessions on the same day', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-15T09:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 8,
      }),
      createMockAnalyticsSession({
        startedAt: '2025-01-15T14:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 6,
      }),
    ];
    const result = computeAccuracyTrend(sessions);
    expect(result).toHaveLength(1);
    // (8+6) / (10+10) = 70%
    expect(result[0].value).toBe(70);
  });

  it('sorts results by date ascending', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-17T10:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 5,
      }),
      createMockAnalyticsSession({
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 9,
      }),
    ];
    const result = computeAccuracyTrend(sessions);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2025-01-15');
    expect(result[1].date).toBe('2025-01-17');
  });

  it('handles sessions with zero questions gracefully', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 0,
        correctAnswers: 0,
      }),
    ];
    const result = computeAccuracyTrend(sessions);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(0);
  });
});

describe('computeTimeTrend', () => {
  it('returns empty array for no sessions', () => {
    expect(computeTimeTrend([])).toEqual([]);
  });

  it('returns time in minutes per day', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-15T10:00:00.000Z',
        durationSeconds: 3600, // 60 minutes
      }),
    ];
    const result = computeTimeTrend(sessions);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(60);
    expect(result[0].label).toBe('60 min');
  });

  it('sums duration for sessions on the same day', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-15T09:00:00.000Z',
        durationSeconds: 1800,
      }),
      createMockAnalyticsSession({
        startedAt: '2025-01-15T14:00:00.000Z',
        durationSeconds: 1200,
      }),
    ];
    const result = computeTimeTrend(sessions);
    expect(result).toHaveLength(1);
    // (1800 + 1200) / 60 = 50 min
    expect(result[0].value).toBe(50);
  });

  it('produces multiple days sorted ascending', () => {
    const sessions = [
      createMockAnalyticsSession({ startedAt: '2025-01-17T10:00:00.000Z', durationSeconds: 600 }),
      createMockAnalyticsSession({ startedAt: '2025-01-15T10:00:00.000Z', durationSeconds: 1200 }),
    ];
    const result = computeTimeTrend(sessions);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2025-01-15');
    expect(result[0].value).toBe(20);
    expect(result[1].date).toBe('2025-01-17');
    expect(result[1].value).toBe(10);
  });
});

describe('computeConfidenceCalibration', () => {
  it('returns empty array for no sessions', () => {
    expect(computeConfidenceCalibration([])).toEqual([]);
  });

  it('computes calibration based on mastered + knowledgeGap', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 10,
        confidenceMatrix: {
          mastered: 4,
          solid: 1,
          luckyGuess: 1,
          misconception: 1,
          weakArea: 1,
          knowledgeGap: 2,
        },
      }),
    ];
    const result = computeConfidenceCalibration(sessions);
    expect(result).toHaveLength(1);
    // (4 + 2) / 10 * 100 = 60%
    expect(result[0].value).toBe(60);
  });

  it('handles zero total questions', () => {
    const sessions = [
      createMockAnalyticsSession({
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 0,
        confidenceMatrix: {
          mastered: 0,
          solid: 0,
          luckyGuess: 0,
          misconception: 0,
          weakArea: 0,
          knowledgeGap: 0,
        },
      }),
    ];
    const result = computeConfidenceCalibration(sessions);
    expect(result[0].value).toBe(0);
  });
});

describe('computeSubjectProgression', () => {
  it('groups sessions by subject', () => {
    const sessions = [
      createMockAnalyticsSession({
        subject: 'Ethics',
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 7,
      }),
      createMockAnalyticsSession({
        subject: 'Quant',
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 5,
      }),
      createMockAnalyticsSession({
        subject: 'Ethics',
        startedAt: '2025-01-16T10:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 9,
      }),
    ];

    const result = computeSubjectProgression(sessions);
    expect(Object.keys(result)).toContain('Ethics');
    expect(Object.keys(result)).toContain('Quant');
    expect(result['Ethics']).toHaveLength(2);
    expect(result['Quant']).toHaveLength(1);
  });

  it('uses Mixed for null subject', () => {
    const sessions = [
      createMockAnalyticsSession({
        subject: null,
        startedAt: '2025-01-15T10:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 6,
      }),
    ];
    const result = computeSubjectProgression(sessions);
    expect(Object.keys(result)).toContain('Mixed');
    expect(result['Mixed'][0].value).toBe(60);
  });
});

describe('getAccuracyDirection', () => {
  it('returns flat for fewer than 2 sessions', () => {
    expect(getAccuracyDirection([])).toBe('flat');
    expect(getAccuracyDirection([createMockAnalyticsSession()])).toBe('flat');
  });

  it('returns up when later sessions are better', () => {
    const sessions = [
      createMockAnalyticsSession({ startedAt: '2025-01-01T10:00:00.000Z', totalQuestions: 10, correctAnswers: 3 }),
      createMockAnalyticsSession({ startedAt: '2025-01-02T10:00:00.000Z', totalQuestions: 10, correctAnswers: 4 }),
      createMockAnalyticsSession({ startedAt: '2025-01-03T10:00:00.000Z', totalQuestions: 10, correctAnswers: 5 }),
      createMockAnalyticsSession({ startedAt: '2025-01-04T10:00:00.000Z', totalQuestions: 10, correctAnswers: 8 }),
      createMockAnalyticsSession({ startedAt: '2025-01-05T10:00:00.000Z', totalQuestions: 10, correctAnswers: 9 }),
      createMockAnalyticsSession({ startedAt: '2025-01-06T10:00:00.000Z', totalQuestions: 10, correctAnswers: 9 }),
    ];
    expect(getAccuracyDirection(sessions)).toBe('up');
  });

  it('returns down when later sessions are worse', () => {
    const sessions = [
      createMockAnalyticsSession({ startedAt: '2025-01-01T10:00:00.000Z', totalQuestions: 10, correctAnswers: 9 }),
      createMockAnalyticsSession({ startedAt: '2025-01-02T10:00:00.000Z', totalQuestions: 10, correctAnswers: 8 }),
      createMockAnalyticsSession({ startedAt: '2025-01-03T10:00:00.000Z', totalQuestions: 10, correctAnswers: 8 }),
      createMockAnalyticsSession({ startedAt: '2025-01-04T10:00:00.000Z', totalQuestions: 10, correctAnswers: 5 }),
      createMockAnalyticsSession({ startedAt: '2025-01-05T10:00:00.000Z', totalQuestions: 10, correctAnswers: 4 }),
      createMockAnalyticsSession({ startedAt: '2025-01-06T10:00:00.000Z', totalQuestions: 10, correctAnswers: 4 }),
    ];
    expect(getAccuracyDirection(sessions)).toBe('down');
  });

  it('returns flat when performance is stable', () => {
    const sessions = [
      createMockAnalyticsSession({ startedAt: '2025-01-01T10:00:00.000Z', totalQuestions: 10, correctAnswers: 7 }),
      createMockAnalyticsSession({ startedAt: '2025-01-02T10:00:00.000Z', totalQuestions: 10, correctAnswers: 7 }),
      createMockAnalyticsSession({ startedAt: '2025-01-03T10:00:00.000Z', totalQuestions: 10, correctAnswers: 7 }),
      createMockAnalyticsSession({ startedAt: '2025-01-04T10:00:00.000Z', totalQuestions: 10, correctAnswers: 7 }),
    ];
    expect(getAccuracyDirection(sessions)).toBe('flat');
  });
});
