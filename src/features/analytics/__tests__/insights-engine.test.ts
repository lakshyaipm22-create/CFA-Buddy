import { describe, it, expect } from 'vitest';
import { generateSmartInsights } from '../utils/insights-engine';
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

describe('generateSmartInsights', () => {
  it('returns empty array for no sessions', () => {
    expect(generateSmartInsights([])).toEqual([]);
  });

  it('returns at most 5 insights', () => {
    // Create many sessions to trigger multiple insights
    const sessions = Array.from({ length: 20 }, (_, i) =>
      createMockAnalyticsSession({
        startedAt: `2025-01-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
        totalQuestions: 10,
        correctAnswers: i < 10 ? 3 : 9,
        accuracy: i < 10 ? 30 : 90,
        isTimed: true,
        durationSeconds: 1500, // 150s per question (>120)
        subject: 'Ethics',
        confidenceBreakdown: { certain: 4, certainCorrect: 2, thinkSo: 2, guess: 6, total: 10 },
        confidenceMatrix: {
          mastered: 2,
          solid: 1,
          luckyGuess: 0,
          misconception: 3,
          weakArea: 2,
          knowledgeGap: 2,
        },
      })
    );
    const insights = generateSmartInsights(sessions);
    expect(insights.length).toBeLessThanOrEqual(5);
  });

  it('generates success insight for improving user', () => {
    // Earlier sessions bad, later sessions good
    const sessions = [
      createMockAnalyticsSession({ startedAt: '2025-01-01T10:00:00.000Z', totalQuestions: 10, correctAnswers: 3, accuracy: 30 }),
      createMockAnalyticsSession({ startedAt: '2025-01-02T10:00:00.000Z', totalQuestions: 10, correctAnswers: 3, accuracy: 30 }),
      createMockAnalyticsSession({ startedAt: '2025-01-03T10:00:00.000Z', totalQuestions: 10, correctAnswers: 4, accuracy: 40 }),
      createMockAnalyticsSession({ startedAt: '2025-01-04T10:00:00.000Z', totalQuestions: 10, correctAnswers: 8, accuracy: 80 }),
      createMockAnalyticsSession({ startedAt: '2025-01-05T10:00:00.000Z', totalQuestions: 10, correctAnswers: 9, accuracy: 90 }),
      createMockAnalyticsSession({ startedAt: '2025-01-06T10:00:00.000Z', totalQuestions: 10, correctAnswers: 9, accuracy: 90 }),
    ];

    const insights = generateSmartInsights(sessions);
    const accuracyInsight = insights.find(i => i.id === 'accuracy-improving');
    expect(accuracyInsight).toBeDefined();
    expect(accuracyInsight!.type).toBe('success');
  });

  it('generates warning insight for declining user', () => {
    // Earlier sessions good, later sessions bad
    const sessions = [
      createMockAnalyticsSession({ startedAt: '2025-01-01T10:00:00.000Z', totalQuestions: 10, correctAnswers: 9, accuracy: 90 }),
      createMockAnalyticsSession({ startedAt: '2025-01-02T10:00:00.000Z', totalQuestions: 10, correctAnswers: 9, accuracy: 90 }),
      createMockAnalyticsSession({ startedAt: '2025-01-03T10:00:00.000Z', totalQuestions: 10, correctAnswers: 8, accuracy: 80 }),
      createMockAnalyticsSession({ startedAt: '2025-01-04T10:00:00.000Z', totalQuestions: 10, correctAnswers: 4, accuracy: 40 }),
      createMockAnalyticsSession({ startedAt: '2025-01-05T10:00:00.000Z', totalQuestions: 10, correctAnswers: 3, accuracy: 30 }),
      createMockAnalyticsSession({ startedAt: '2025-01-06T10:00:00.000Z', totalQuestions: 10, correctAnswers: 3, accuracy: 30 }),
    ];

    const insights = generateSmartInsights(sessions);
    const accuracyInsight = insights.find(i => i.id === 'accuracy-declining');
    expect(accuracyInsight).toBeDefined();
    expect(accuracyInsight!.type).toBe('warning');
  });

  it('generates minimal insights for new user with few sessions', () => {
    const sessions = [
      createMockAnalyticsSession({
        totalQuestions: 5,
        correctAnswers: 3,
        confidenceBreakdown: { certain: 3, certainCorrect: 2, thinkSo: 2, guess: 1, total: 5 },
      }),
    ];

    const insights = generateSmartInsights(sessions);
    // Few sessions and few questions means most analyses won't trigger
    // (need >= 3 sessions for accuracy trend, >= 10 questions for guessing, etc.)
    expect(insights.length).toBeLessThanOrEqual(2);
  });

  it('generates guessing warning for heavy guesser', () => {
    const sessions = [
      createMockAnalyticsSession({
        totalQuestions: 20,
        correctAnswers: 8,
        confidenceBreakdown: { certain: 4, certainCorrect: 2, thinkSo: 2, guess: 16, total: 20 },
        confidenceMatrix: { mastered: 2, solid: 2, luckyGuess: 4, misconception: 0, weakArea: 0, knowledgeGap: 10 },
      }),
      createMockAnalyticsSession({
        totalQuestions: 20,
        correctAnswers: 6,
        confidenceBreakdown: { certain: 2, certainCorrect: 1, thinkSo: 3, guess: 16, total: 20 },
        confidenceMatrix: { mastered: 1, solid: 2, luckyGuess: 3, misconception: 0, weakArea: 1, knowledgeGap: 13 },
      }),
    ];

    const insights = generateSmartInsights(sessions);
    const guessingInsight = insights.find(i => i.id === 'high-guessing');
    expect(guessingInsight).toBeDefined();
    expect(guessingInsight!.type).toBe('warning');
    expect(guessingInsight!.description).toContain('guesses');
  });

  it('generates strong knowledge base insight for low guessing', () => {
    const sessions = [
      createMockAnalyticsSession({
        totalQuestions: 30,
        correctAnswers: 25,
        confidenceBreakdown: { certain: 21, certainCorrect: 20, thinkSo: 8, guess: 2, total: 30 },
        confidenceMatrix: { mastered: 20, solid: 4, luckyGuess: 1, misconception: 1, weakArea: 3, knowledgeGap: 1 },
      }),
    ];

    const insights = generateSmartInsights(sessions);
    const knowledgeInsight = insights.find(i => i.id === 'low-guessing');
    expect(knowledgeInsight).toBeDefined();
    expect(knowledgeInsight!.type).toBe('success');
  });

  it('generates weakest subject insight when a subject is below 70%', () => {
    const sessions = [
      createMockAnalyticsSession({
        subject: 'Ethics',
        totalQuestions: 10,
        correctAnswers: 9,
        confidenceBreakdown: { certain: 9, certainCorrect: 8, thinkSo: 1, guess: 1, total: 10 },
      }),
      createMockAnalyticsSession({
        subject: 'Quant',
        totalQuestions: 10,
        correctAnswers: 4,
        confidenceBreakdown: { certain: 5, certainCorrect: 2, thinkSo: 3, guess: 5, total: 10 },
      }),
    ];

    const insights = generateSmartInsights(sessions);
    const weakInsight = insights.find(i => i.id === 'weakest-subject');
    expect(weakInsight).toBeDefined();
    expect(weakInsight!.type).toBe('danger');
    expect(weakInsight!.title).toContain('Quant');
  });

  it('generates time management insight for slow paced timed sessions', () => {
    const sessions = [
      createMockAnalyticsSession({
        isTimed: true,
        totalQuestions: 10,
        durationSeconds: 1500, // 150s per question
        startedAt: '2025-01-01T10:00:00.000Z',
      }),
      createMockAnalyticsSession({
        isTimed: true,
        totalQuestions: 10,
        durationSeconds: 1400,
        startedAt: '2025-01-02T10:00:00.000Z',
      }),
      createMockAnalyticsSession({
        isTimed: true,
        totalQuestions: 10,
        durationSeconds: 1300,
        startedAt: '2025-01-03T10:00:00.000Z',
      }),
    ];

    const insights = generateSmartInsights(sessions);
    const timeInsight = insights.find(i => i.id === 'slow-pace');
    expect(timeInsight).toBeDefined();
    expect(timeInsight!.type).toBe('info');
  });

  it('generates misconception alert for high misconception rate', () => {
    const sessions = [
      createMockAnalyticsSession({
        totalQuestions: 20,
        correctAnswers: 10,
        confidenceBreakdown: { certain: 10, certainCorrect: 5, thinkSo: 5, guess: 10, total: 20 },
        confidenceMatrix: { mastered: 5, solid: 3, luckyGuess: 2, misconception: 5, weakArea: 3, knowledgeGap: 2 },
      }),
    ];

    const insights = generateSmartInsights(sessions);
    const misconceptionInsight = insights.find(i => i.id === 'misconception-alert');
    expect(misconceptionInsight).toBeDefined();
    expect(misconceptionInsight!.type).toBe('danger');
  });

  it('does not generate misconception alert when rate is low', () => {
    const sessions = [
      createMockAnalyticsSession({
        totalQuestions: 20,
        correctAnswers: 18,
        confidenceBreakdown: { certain: 16, certainCorrect: 15, thinkSo: 3, guess: 2, total: 20 },
        confidenceMatrix: { mastered: 15, solid: 2, luckyGuess: 1, misconception: 1, weakArea: 1, knowledgeGap: 0 },
      }),
    ];

    const insights = generateSmartInsights(sessions);
    const misconceptionInsight = insights.find(i => i.id === 'misconception-alert');
    expect(misconceptionInsight).toBeUndefined();
  });
});
