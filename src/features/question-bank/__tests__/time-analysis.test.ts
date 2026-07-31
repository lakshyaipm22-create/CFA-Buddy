import { describe, it, expect } from 'vitest';
import {
  computeTimeVsCorrectness,
  computePaceAnalysis,
  identifySlowestQuestions,
  computeTimeTrends,
} from '../utils/time-analysis';
import type { AttemptQuestion, PracticeAttempt } from '../types/attempt';
import type { Question } from '../types';

function createAttemptQuestion(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: 'q-1',
    selectedAnswer: 'A',
    correct: true,
    timeSpentSeconds: 60,
    confidence: 'High',
    ...overrides,
  };
}

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-1',
    questionText: 'What is the capital structure?',
    answerChoices: [
      { label: 'A', text: 'Answer A', isCorrect: true, explanation: 'Correct' },
      { label: 'B', text: 'Answer B', isCorrect: false, explanation: 'Wrong' },
      { label: 'C', text: 'Answer C', isCorrect: false, explanation: 'Wrong' },
    ],
    difficulty: 'Medium',
    subject: 'Corporate Issuers',
    reading: null,
    topic: null,
    provider: 'test',
    questionSourceFile: null,
    ...overrides,
  };
}

describe('computeTimeVsCorrectness', () => {
  it('should split attempts into correct and incorrect buckets', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ questionId: 'q-1', correct: true, timeSpentSeconds: 45 }),
      createAttemptQuestion({ questionId: 'q-2', correct: false, timeSpentSeconds: 120 }),
      createAttemptQuestion({ questionId: 'q-3', correct: true, timeSpentSeconds: 30 }),
      createAttemptQuestion({ questionId: 'q-4', correct: false, timeSpentSeconds: 90 }),
    ];

    const result = computeTimeVsCorrectness(attempts);

    expect(result.correctPoints).toHaveLength(2);
    expect(result.incorrectPoints).toHaveLength(2);
    expect(result.correctPoints[0].timeSpentSeconds).toBe(45);
    expect(result.correctPoints[1].timeSpentSeconds).toBe(30);
    expect(result.incorrectPoints[0].timeSpentSeconds).toBe(120);
    expect(result.incorrectPoints[1].timeSpentSeconds).toBe(90);
  });

  it('should compute average times correctly', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ questionId: 'q-1', correct: true, timeSpentSeconds: 40 }),
      createAttemptQuestion({ questionId: 'q-2', correct: true, timeSpentSeconds: 60 }),
      createAttemptQuestion({ questionId: 'q-3', correct: false, timeSpentSeconds: 100 }),
      createAttemptQuestion({ questionId: 'q-4', correct: false, timeSpentSeconds: 80 }),
    ];

    const result = computeTimeVsCorrectness(attempts);

    expect(result.averageTimeCorrect).toBe(50);
    expect(result.averageTimeIncorrect).toBe(90);
  });

  it('should handle empty input', () => {
    const result = computeTimeVsCorrectness([]);
    expect(result.correctPoints).toHaveLength(0);
    expect(result.incorrectPoints).toHaveLength(0);
    expect(result.averageTimeCorrect).toBe(0);
    expect(result.averageTimeIncorrect).toBe(0);
  });

  it('should handle all correct answers', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ questionId: 'q-1', correct: true, timeSpentSeconds: 30 }),
      createAttemptQuestion({ questionId: 'q-2', correct: true, timeSpentSeconds: 60 }),
    ];

    const result = computeTimeVsCorrectness(attempts);
    expect(result.correctPoints).toHaveLength(2);
    expect(result.incorrectPoints).toHaveLength(0);
    expect(result.averageTimeIncorrect).toBe(0);
  });
});

describe('computePaceAnalysis', () => {
  it('should categorize as Rushing when avg < 30s', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ timeSpentSeconds: 15 }),
      createAttemptQuestion({ timeSpentSeconds: 20 }),
      createAttemptQuestion({ timeSpentSeconds: 25 }),
    ];

    const result = computePaceAnalysis(attempts);
    expect(result.category).toBe('Rushing');
    expect(result.averageTime).toBe(20);
    expect(result.recommendation).toContain('too quickly');
  });

  it('should categorize as Optimal when avg 30-90s', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ timeSpentSeconds: 45 }),
      createAttemptQuestion({ timeSpentSeconds: 60 }),
      createAttemptQuestion({ timeSpentSeconds: 55 }),
    ];

    const result = computePaceAnalysis(attempts);
    expect(result.category).toBe('Optimal');
    expect(result.recommendation).toContain('well-balanced');
  });

  it('should categorize as Overthinking when avg > 90s', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ timeSpentSeconds: 100 }),
      createAttemptQuestion({ timeSpentSeconds: 120 }),
      createAttemptQuestion({ timeSpentSeconds: 95 }),
    ];

    const result = computePaceAnalysis(attempts);
    expect(result.category).toBe('Overthinking');
    expect(result.recommendation).toContain('too long');
  });

  it('should compute median correctly for odd number of values', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ timeSpentSeconds: 10 }),
      createAttemptQuestion({ timeSpentSeconds: 30 }),
      createAttemptQuestion({ timeSpentSeconds: 50 }),
    ];

    const result = computePaceAnalysis(attempts);
    expect(result.medianTime).toBe(30);
  });

  it('should compute median correctly for even number of values', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ timeSpentSeconds: 10 }),
      createAttemptQuestion({ timeSpentSeconds: 20 }),
      createAttemptQuestion({ timeSpentSeconds: 30 }),
      createAttemptQuestion({ timeSpentSeconds: 40 }),
    ];

    const result = computePaceAnalysis(attempts);
    expect(result.medianTime).toBe(25);
  });

  it('should compute percentiles', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ timeSpentSeconds: 10 }),
      createAttemptQuestion({ timeSpentSeconds: 20 }),
      createAttemptQuestion({ timeSpentSeconds: 30 }),
      createAttemptQuestion({ timeSpentSeconds: 40 }),
      createAttemptQuestion({ timeSpentSeconds: 50 }),
    ];

    const result = computePaceAnalysis(attempts);
    expect(result.p25).toBe(20);
    expect(result.p75).toBe(40);
    expect(result.totalQuestions).toBe(5);
  });

  it('should handle empty input', () => {
    const result = computePaceAnalysis([]);
    expect(result.category).toBe('Optimal');
    expect(result.averageTime).toBe(0);
    expect(result.totalQuestions).toBe(0);
  });
});

describe('identifySlowestQuestions', () => {
  it('should return top N slowest questions', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ questionId: 'q-1', timeSpentSeconds: 30 }),
      createAttemptQuestion({ questionId: 'q-2', timeSpentSeconds: 120 }),
      createAttemptQuestion({ questionId: 'q-3', timeSpentSeconds: 90 }),
      createAttemptQuestion({ questionId: 'q-4', timeSpentSeconds: 60 }),
    ];

    const questions: Question[] = [
      createQuestion({ id: 'q-1', questionText: 'Question 1' }),
      createQuestion({ id: 'q-2', questionText: 'Question 2' }),
      createQuestion({ id: 'q-3', questionText: 'Question 3' }),
      createQuestion({ id: 'q-4', questionText: 'Question 4' }),
    ];

    const result = identifySlowestQuestions(attempts, questions, 3);

    expect(result).toHaveLength(3);
    expect(result[0].questionId).toBe('q-2');
    expect(result[0].timeSpentSeconds).toBe(120);
    expect(result[1].questionId).toBe('q-3');
    expect(result[1].timeSpentSeconds).toBe(90);
    expect(result[2].questionId).toBe('q-4');
    expect(result[2].timeSpentSeconds).toBe(60);
  });

  it('should match question metadata', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ questionId: 'q-1', timeSpentSeconds: 100, correct: false }),
    ];

    const questions: Question[] = [
      createQuestion({ id: 'q-1', questionText: 'What is WACC?', subject: 'Corporate Issuers' }),
    ];

    const result = identifySlowestQuestions(attempts, questions, 10);

    expect(result).toHaveLength(1);
    expect(result[0].questionText).toBe('What is WACC?');
    expect(result[0].subject).toBe('Corporate Issuers');
    expect(result[0].correct).toBe(false);
  });

  it('should deduplicate by question ID', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ questionId: 'q-1', timeSpentSeconds: 100 }),
      createAttemptQuestion({ questionId: 'q-1', timeSpentSeconds: 80 }),
      createAttemptQuestion({ questionId: 'q-2', timeSpentSeconds: 50 }),
    ];

    const questions: Question[] = [
      createQuestion({ id: 'q-1', questionText: 'Q1' }),
      createQuestion({ id: 'q-2', questionText: 'Q2' }),
    ];

    const result = identifySlowestQuestions(attempts, questions, 10);

    expect(result).toHaveLength(2);
    // q-1 appears first with highest time (100s)
    expect(result[0].questionId).toBe('q-1');
    expect(result[0].timeSpentSeconds).toBe(100);
  });

  it('should handle missing question metadata gracefully', () => {
    const attempts: AttemptQuestion[] = [
      createAttemptQuestion({ questionId: 'unknown-id', timeSpentSeconds: 200 }),
    ];

    const result = identifySlowestQuestions(attempts, [], 10);

    expect(result).toHaveLength(1);
    expect(result[0].questionText).toBe('Unknown Question');
    expect(result[0].subject).toBe('Unknown');
  });

  it('should default topN to 10', () => {
    const attempts: AttemptQuestion[] = Array.from({ length: 15 }, (_, i) =>
      createAttemptQuestion({ questionId: `q-${i}`, timeSpentSeconds: 100 - i })
    );
    const questions: Question[] = attempts.map(a =>
      createQuestion({ id: a.questionId, questionText: `Question ${a.questionId}` })
    );

    const result = identifySlowestQuestions(attempts, questions);
    expect(result).toHaveLength(10);
  });
});

describe('computeTimeTrends', () => {
  it('should compute time trends across attempts', () => {
    const attempts: PracticeAttempt[] = [
      {
        id: 'a-1',
        subjectName: 'Corporate Issuers',
        attemptNumber: 1,
        completedAt: '2025-01-10T10:00:00Z',
        moduleResults: [],
        overallScore: 8,
        overallTotal: 10,
        overallPercentage: 80,
        avgTimePerQuestion: 45,
        bookmarkedIds: [],
        confidenceLevel: 'High',
      },
      {
        id: 'a-2',
        subjectName: 'Corporate Issuers',
        attemptNumber: 2,
        completedAt: '2025-01-15T10:00:00Z',
        moduleResults: [],
        overallScore: 9,
        overallTotal: 10,
        overallPercentage: 90,
        avgTimePerQuestion: 38,
        bookmarkedIds: [],
        confidenceLevel: 'High',
      },
    ];

    const result = computeTimeTrends(attempts);

    expect(result).toHaveLength(2);
    expect(result[0].avgTimeSeconds).toBe(45);
    expect(result[1].avgTimeSeconds).toBe(38);
    expect(result[0].attemptNumber).toBe(1);
    expect(result[1].attemptNumber).toBe(2);
  });

  it('should handle empty input', () => {
    const result = computeTimeTrends([]);
    expect(result).toHaveLength(0);
  });

  it('should sort by completion date', () => {
    const attempts: PracticeAttempt[] = [
      {
        id: 'a-2',
        subjectName: 'Corporate Issuers',
        attemptNumber: 2,
        completedAt: '2025-01-20T10:00:00Z',
        moduleResults: [],
        overallScore: 9,
        overallTotal: 10,
        overallPercentage: 90,
        avgTimePerQuestion: 30,
        bookmarkedIds: [],
        confidenceLevel: 'High',
      },
      {
        id: 'a-1',
        subjectName: 'Corporate Issuers',
        attemptNumber: 1,
        completedAt: '2025-01-10T10:00:00Z',
        moduleResults: [],
        overallScore: 7,
        overallTotal: 10,
        overallPercentage: 70,
        avgTimePerQuestion: 55,
        bookmarkedIds: [],
        confidenceLevel: 'Medium',
      },
    ];

    const result = computeTimeTrends(attempts);

    // Should be sorted by date, earliest first
    expect(result[0].avgTimeSeconds).toBe(55);
    expect(result[1].avgTimeSeconds).toBe(30);
  });
});
