import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveAttempt, getAttemptById } from '../utils/attempt-storage';
import { buildAttemptConfidenceMatrix } from '../components/confidence-calibration';
import { generateNotesExport } from '../components/attempt-review';
import type { PracticeAttempt, AttemptQuestion } from '../types/attempt';
import type { ErrorClassification, Question } from '../types';

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

function createMockAttempt(questionAttempts: AttemptQuestion[]): PracticeAttempt {
  return {
    id: 'test-attempt-1',
    subjectName: 'Corporate Issuers',
    attemptNumber: 1,
    completedAt: '2025-01-15T10:00:00Z',
    moduleResults: [
      {
        moduleId: 'mod-1',
        moduleName: 'Test Module',
        score: questionAttempts.filter(q => q.correct).length,
        total: questionAttempts.length,
        percentage: questionAttempts.length > 0
          ? Math.round((questionAttempts.filter(q => q.correct).length / questionAttempts.length) * 100)
          : 0,
        avgTimePerQuestion: 60,
        questionAttempts,
      },
    ],
    overallScore: questionAttempts.filter(q => q.correct).length,
    overallTotal: questionAttempts.length,
    overallPercentage: questionAttempts.length > 0
      ? Math.round((questionAttempts.filter(q => q.correct).length / questionAttempts.length) * 100)
      : 0,
    avgTimePerQuestion: 60,
    bookmarkedIds: [],
    confidenceLevel: 'Medium',
  };
}

describe('Error Classification Persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('saves error classification to an attempt question and persists it', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 45, confidence: 'High' },
      { questionId: 'q2', selectedAnswer: 'B', correct: true, timeSpentSeconds: 30, confidence: 'Medium' },
    ];

    const attempt = createMockAttempt(questions);
    saveAttempt(attempt);

    // Simulate classifying the error
    const updated: PracticeAttempt = {
      ...attempt,
      moduleResults: attempt.moduleResults.map(m => ({
        ...m,
        questionAttempts: m.questionAttempts.map(qa =>
          qa.questionId === 'q1'
            ? { ...qa, errorClassification: 'ForgotFormula' as ErrorClassification }
            : qa
        ),
      })),
    };
    saveAttempt(updated);

    // Reload and verify
    const loaded = getAttemptById('test-attempt-1');
    expect(loaded).not.toBeNull();
    const q1 = loaded!.moduleResults[0].questionAttempts.find(qa => qa.questionId === 'q1');
    expect(q1?.errorClassification).toBe('ForgotFormula');
  });

  it('preserves undefined errorClassification when not set', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 45, confidence: 'High' },
    ];

    const attempt = createMockAttempt(questions);
    saveAttempt(attempt);

    const loaded = getAttemptById('test-attempt-1');
    const q1 = loaded!.moduleResults[0].questionAttempts.find(qa => qa.questionId === 'q1');
    expect(q1?.errorClassification).toBeUndefined();
  });

  it('can update error classification from one type to another', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 45, confidence: 'High', errorClassification: 'Careless' },
    ];

    const attempt = createMockAttempt(questions);
    saveAttempt(attempt);

    // Change classification
    const updated: PracticeAttempt = {
      ...attempt,
      moduleResults: attempt.moduleResults.map(m => ({
        ...m,
        questionAttempts: m.questionAttempts.map(qa =>
          qa.questionId === 'q1'
            ? { ...qa, errorClassification: 'MisreadQuestion' as ErrorClassification }
            : qa
        ),
      })),
    };
    saveAttempt(updated);

    const loaded = getAttemptById('test-attempt-1');
    const q1 = loaded!.moduleResults[0].questionAttempts.find(qa => qa.questionId === 'q1');
    expect(q1?.errorClassification).toBe('MisreadQuestion');
  });

  it('can clear error classification by setting undefined', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 45, confidence: 'High', errorClassification: 'Careless' },
    ];

    const attempt = createMockAttempt(questions);
    saveAttempt(attempt);

    // Clear classification
    const updated: PracticeAttempt = {
      ...attempt,
      moduleResults: attempt.moduleResults.map(m => ({
        ...m,
        questionAttempts: m.questionAttempts.map(qa =>
          qa.questionId === 'q1'
            ? { ...qa, errorClassification: undefined }
            : qa
        ),
      })),
    };
    saveAttempt(updated);

    const loaded = getAttemptById('test-attempt-1');
    const q1 = loaded!.moduleResults[0].questionAttempts.find(qa => qa.questionId === 'q1');
    expect(q1?.errorClassification).toBeUndefined();
  });
});

describe('Confidence Matrix Computation (High/Medium/Low mapping)', () => {
  it('maps High+Correct to mastered', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
    ];
    const attempt = createMockAttempt(questions);
    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.mastered).toBe(1);
    expect(matrix.solid).toBe(0);
    expect(matrix.luckyGuess).toBe(0);
    expect(matrix.misconception).toBe(0);
    expect(matrix.weakArea).toBe(0);
    expect(matrix.knowledgeGap).toBe(0);
  });

  it('maps High+Incorrect to misconception', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 30, confidence: 'High' },
    ];
    const attempt = createMockAttempt(questions);
    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.misconception).toBe(1);
    expect(matrix.mastered).toBe(0);
  });

  it('maps Medium+Correct to solid', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'Medium' },
    ];
    const attempt = createMockAttempt(questions);
    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.solid).toBe(1);
    expect(matrix.mastered).toBe(0);
  });

  it('maps Medium+Incorrect to weakArea', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 30, confidence: 'Medium' },
    ];
    const attempt = createMockAttempt(questions);
    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.weakArea).toBe(1);
  });

  it('maps Low+Correct to luckyGuess', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'Low' },
    ];
    const attempt = createMockAttempt(questions);
    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.luckyGuess).toBe(1);
  });

  it('maps Low+Incorrect to knowledgeGap', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 30, confidence: 'Low' },
    ];
    const attempt = createMockAttempt(questions);
    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.knowledgeGap).toBe(1);
  });

  it('correctly aggregates multiple questions across all categories', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
      { questionId: 'q2', selectedAnswer: 'B', correct: true, timeSpentSeconds: 30, confidence: 'High' },
      { questionId: 'q3', selectedAnswer: 'A', correct: false, timeSpentSeconds: 30, confidence: 'High' },
      { questionId: 'q4', selectedAnswer: 'B', correct: true, timeSpentSeconds: 30, confidence: 'Medium' },
      { questionId: 'q5', selectedAnswer: 'A', correct: false, timeSpentSeconds: 30, confidence: 'Medium' },
      { questionId: 'q6', selectedAnswer: 'C', correct: true, timeSpentSeconds: 30, confidence: 'Low' },
      { questionId: 'q7', selectedAnswer: 'A', correct: false, timeSpentSeconds: 30, confidence: 'Low' },
      { questionId: 'q8', selectedAnswer: 'B', correct: false, timeSpentSeconds: 30, confidence: 'Low' },
    ];
    const attempt = createMockAttempt(questions);
    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.mastered).toBe(2);
    expect(matrix.misconception).toBe(1);
    expect(matrix.solid).toBe(1);
    expect(matrix.weakArea).toBe(1);
    expect(matrix.luckyGuess).toBe(1);
    expect(matrix.knowledgeGap).toBe(2);
  });

  it('handles attempt with multiple modules', () => {
    const attempt: PracticeAttempt = {
      id: 'multi-module',
      subjectName: 'Corporate Issuers',
      attemptNumber: 1,
      completedAt: '2025-01-15T10:00:00Z',
      moduleResults: [
        {
          moduleId: 'mod-1',
          moduleName: 'Module A',
          score: 1,
          total: 2,
          percentage: 50,
          avgTimePerQuestion: 60,
          questionAttempts: [
            { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
            { questionId: 'q2', selectedAnswer: 'B', correct: false, timeSpentSeconds: 30, confidence: 'High' },
          ],
        },
        {
          moduleId: 'mod-2',
          moduleName: 'Module B',
          score: 1,
          total: 2,
          percentage: 50,
          avgTimePerQuestion: 60,
          questionAttempts: [
            { questionId: 'q3', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'Low' },
            { questionId: 'q4', selectedAnswer: 'B', correct: false, timeSpentSeconds: 30, confidence: 'Medium' },
          ],
        },
      ],
      overallScore: 2,
      overallTotal: 4,
      overallPercentage: 50,
      avgTimePerQuestion: 60,
      bookmarkedIds: [],
      confidenceLevel: 'Low',
    };

    const matrix = buildAttemptConfidenceMatrix(attempt);

    expect(matrix.mastered).toBe(1);
    expect(matrix.misconception).toBe(1);
    expect(matrix.luckyGuess).toBe(1);
    expect(matrix.weakArea).toBe(1);
    expect(matrix.solid).toBe(0);
    expect(matrix.knowledgeGap).toBe(0);
  });
});

describe('Notes Export Format Generation', () => {
  it('generates correct header with subject and attempt info', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
    ];
    const attempt = createMockAttempt(questions);
    const mockQuestions: Question[] = [
      {
        id: 'q1',
        questionText: 'What is corporate governance?',
        answerChoices: [],
        difficulty: 'Easy',
        subject: 'Corporate Issuers',
        reading: null,
        topic: 'Corporate Governance',
        provider: 'cfa-portal',
        questionSourceFile: null,
      },
    ];
    const notes: Record<string, string> = { q1: 'Important concept to remember' };

    const output = generateNotesExport(attempt, mockQuestions, notes);

    expect(output).toContain('Notes Export - Corporate Issuers (Attempt #1)');
    expect(output).toContain('Date:');
  });

  it('includes question text, module, result, and note content', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 30, confidence: 'High', errorClassification: 'ForgotFormula' },
    ];
    const attempt = createMockAttempt(questions);
    const mockQuestions: Question[] = [
      {
        id: 'q1',
        questionText: 'What is the formula for WACC?',
        answerChoices: [],
        difficulty: 'Medium',
        subject: 'Corporate Issuers',
        reading: null,
        topic: 'Capital Structure',
        provider: 'cfa-portal',
        questionSourceFile: null,
      },
    ];
    const notes: Record<string, string> = { q1: 'Need to memorize WACC formula' };

    const output = generateNotesExport(attempt, mockQuestions, notes);

    expect(output).toContain('What is the formula for WACC?');
    expect(output).toContain('Module: Test Module');
    expect(output).toContain('Result: Incorrect');
    expect(output).toContain('Confidence: High');
    expect(output).toContain('Error Type: ForgotFormula');
    expect(output).toContain('Note: Need to memorize WACC formula');
  });

  it('shows total note count at the end', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
      { questionId: 'q2', selectedAnswer: 'B', correct: false, timeSpentSeconds: 30, confidence: 'Medium' },
    ];
    const attempt = createMockAttempt(questions);
    const mockQuestions: Question[] = [
      { id: 'q1', questionText: 'Q1?', answerChoices: [], difficulty: 'Easy', subject: 'Corporate Issuers', reading: null, topic: null, provider: 'cfa-portal', questionSourceFile: null },
      { id: 'q2', questionText: 'Q2?', answerChoices: [], difficulty: 'Easy', subject: 'Corporate Issuers', reading: null, topic: null, provider: 'cfa-portal', questionSourceFile: null },
    ];
    const notes: Record<string, string> = { q1: 'Note 1', q2: 'Note 2' };

    const output = generateNotesExport(attempt, mockQuestions, notes);

    expect(output).toContain('Total notes: 2');
  });

  it('handles no notes gracefully', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
    ];
    const attempt = createMockAttempt(questions);
    const mockQuestions: Question[] = [];
    const notes: Record<string, string> = {};

    const output = generateNotesExport(attempt, mockQuestions, notes);

    expect(output).toContain('No notes found for this attempt.');
  });

  it('only includes notes for questions in the attempt', () => {
    const questions: AttemptQuestion[] = [
      { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
    ];
    const attempt = createMockAttempt(questions);
    const mockQuestions: Question[] = [
      { id: 'q1', questionText: 'Q1?', answerChoices: [], difficulty: 'Easy', subject: 'Corporate Issuers', reading: null, topic: null, provider: 'cfa-portal', questionSourceFile: null },
    ];
    // Note for q99 which is NOT in the attempt
    const notes: Record<string, string> = { q1: 'My note', q99: 'Other note' };

    const output = generateNotesExport(attempt, mockQuestions, notes);

    expect(output).toContain('My note');
    expect(output).not.toContain('Other note');
    expect(output).toContain('Total notes: 1');
  });
});
