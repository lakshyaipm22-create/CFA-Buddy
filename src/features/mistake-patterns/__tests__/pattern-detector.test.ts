import { describe, it, expect, vi } from 'vitest';
import type { PracticeAttempt, AttemptQuestion } from '@/features/question-bank/types/attempt';
import type { Question } from '@/features/question-bank/types';
import {
  detectAllPatterns,
  detectConceptConfusion,
  detectTimePressureErrors,
  detectCalculationErrors,
  detectConfidenceMismatch,
  detectFramingTraps,
} from '../utils/pattern-detector';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock } });

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: `q-${Math.random().toString(36).slice(2, 8)}`,
    questionText: 'Sample question text',
    answerChoices: [
      { label: 'A', text: 'Option A', isCorrect: false, explanation: 'Wrong' },
      { label: 'B', text: 'Option B', isCorrect: true, explanation: 'Correct' },
      { label: 'C', text: 'Option C', isCorrect: false, explanation: 'Wrong' },
    ],
    difficulty: 'Medium',
    subject: 'Financial Statement Analysis',
    reading: null,
    topic: 'Inventory',
    provider: 'test',
    questionSourceFile: null,
    ...overrides,
  };
}

function makeAttemptQuestion(questionId: string, overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId,
    selectedAnswer: 'A',
    correct: false,
    timeSpentSeconds: 60,
    confidence: 'Medium',
    ...overrides,
  };
}

function makePracticeAttempt(questionAttempts: AttemptQuestion[]): PracticeAttempt {
  return {
    id: `attempt-${Math.random().toString(36).slice(2, 8)}`,
    subjectName: 'Financial Statement Analysis',
    attemptNumber: 1,
    completedAt: '2025-01-15T10:00:00Z',
    moduleResults: [{
      moduleId: 'mod-1',
      moduleName: 'Test Module',
      score: questionAttempts.filter(q => q.correct).length,
      total: questionAttempts.length,
      percentage: questionAttempts.length > 0
        ? Math.round((questionAttempts.filter(q => q.correct).length / questionAttempts.length) * 100)
        : 0,
      avgTimePerQuestion: 60,
      questionAttempts,
    }],
    overallScore: questionAttempts.filter(q => q.correct).length,
    overallTotal: questionAttempts.length,
    overallPercentage: 0,
    avgTimePerQuestion: 60,
    bookmarkedIds: [],
    confidenceLevel: 'Medium',
  };
}

describe('Pattern Detector', () => {
  describe('detectAllPatterns', () => {
    it('returns empty patterns for new users with no attempts', () => {
      const patterns = detectAllPatterns([], []);
      expect(patterns).toEqual([]);
    });

    it('returns empty patterns when no significant patterns are found', () => {
      const questions = [
        makeQuestion({ id: 'q1', topic: 'Inventory' }),
        makeQuestion({ id: 'q2', topic: 'Inventory' }),
      ];
      const attempts = [makePracticeAttempt([
        makeAttemptQuestion('q1', { correct: true, timeSpentSeconds: 60, confidence: 'High' }),
        makeAttemptQuestion('q2', { correct: true, timeSpentSeconds: 60, confidence: 'High' }),
      ])];
      const patterns = detectAllPatterns(attempts, questions);
      expect(patterns).toEqual([]);
    });

    it('identifies at least 5 distinct pattern types from appropriate data', () => {
      // Create data that triggers all 5 detectors
      const questions: Question[] = [];
      const questionAttempts: AttemptQuestion[] = [];

      // Concept confusion: Topic A strong, Topic B weak
      for (let i = 0; i < 5; i++) {
        const qStrong = makeQuestion({ id: `strong-${i}`, topic: 'Revenue Recognition', subject: 'FSA' });
        const qWeak = makeQuestion({ id: `weak-${i}`, topic: 'Lease Accounting', subject: 'FSA' });
        questions.push(qStrong, qWeak);
        questionAttempts.push(
          makeAttemptQuestion(`strong-${i}`, { correct: true, timeSpentSeconds: 60, confidence: 'Medium' }),
          makeAttemptQuestion(`weak-${i}`, { correct: false, selectedAnswer: 'A', timeSpentSeconds: 60, confidence: 'Medium' }),
        );
      }

      // Time pressure: fast wrong answers
      for (let i = 0; i < 5; i++) {
        const qFast = makeQuestion({ id: `fast-${i}`, topic: 'Ratios' });
        questions.push(qFast);
        questionAttempts.push(
          makeAttemptQuestion(`fast-${i}`, { correct: false, timeSpentSeconds: 15, confidence: 'Low' }),
        );
      }
      // Some slow correct to establish baseline
      for (let i = 0; i < 10; i++) {
        const qSlow = makeQuestion({ id: `slow-${i}`, topic: 'Ratios' });
        questions.push(qSlow);
        questionAttempts.push(
          makeAttemptQuestion(`slow-${i}`, { correct: true, timeSpentSeconds: 90, confidence: 'Medium' }),
        );
      }

      // Calculation errors: adjacent answer selections
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({
          id: `calc-${i}`,
          topic: 'TVM',
          answerChoices: [
            { label: 'A', text: 'Option A', isCorrect: false, explanation: '' },
            { label: 'B', text: 'Option B', isCorrect: true, explanation: '' },
            { label: 'C', text: 'Option C', isCorrect: false, explanation: '' },
          ],
        });
        questions.push(q);
        // Selected A when correct is B (adjacent)
        questionAttempts.push(
          makeAttemptQuestion(`calc-${i}`, { correct: false, selectedAnswer: 'A', timeSpentSeconds: 60, confidence: 'Medium' }),
        );
      }

      // Confidence mismatch: high confidence + wrong
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `conf-${i}`, topic: 'Derivatives' });
        questions.push(q);
        questionAttempts.push(
          makeAttemptQuestion(`conf-${i}`, { correct: false, confidence: 'High', timeSpentSeconds: 60 }),
        );
      }
      // Need some high confidence correct too
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `conf-correct-${i}`, topic: 'Bonds' });
        questions.push(q);
        questionAttempts.push(
          makeAttemptQuestion(`conf-correct-${i}`, { correct: true, confidence: 'High', timeSpentSeconds: 60 }),
        );
      }

      // Framing traps: Easy correct, Hard wrong in same topic
      for (let i = 0; i < 4; i++) {
        const qEasy = makeQuestion({ id: `easy-${i}`, topic: 'Equity Valuation', difficulty: 'Easy' });
        const qHard = makeQuestion({ id: `hard-${i}`, topic: 'Equity Valuation', difficulty: 'Hard' });
        questions.push(qEasy, qHard);
        questionAttempts.push(
          makeAttemptQuestion(`easy-${i}`, { correct: true, timeSpentSeconds: 45, confidence: 'High' }),
          makeAttemptQuestion(`hard-${i}`, { correct: false, timeSpentSeconds: 60, confidence: 'Medium' }),
        );
      }

      const attempts = [makePracticeAttempt(questionAttempts)];
      const patterns = detectAllPatterns(attempts, questions);

      const patternTypes = new Set(patterns.map(p => p.patternType));
      expect(patternTypes.size).toBeGreaterThanOrEqual(5);
      expect(patternTypes.has('conceptConfusion')).toBe(true);
      expect(patternTypes.has('timePressure')).toBe(true);
      expect(patternTypes.has('calculationError')).toBe(true);
      expect(patternTypes.has('confidenceMismatch')).toBe(true);
      expect(patternTypes.has('framingTrap')).toBe(true);
    });

    it('sorts patterns by severity then occurrence count', () => {
      // Set up data that will produce high and low severity patterns
      const questions: Question[] = [];
      const questionAttempts: AttemptQuestion[] = [];

      // High confidence wrong (many occurrences)
      for (let i = 0; i < 8; i++) {
        const q = makeQuestion({ id: `conf-h-${i}`, topic: 'Ethics' });
        questions.push(q);
        questionAttempts.push(
          makeAttemptQuestion(`conf-h-${i}`, { correct: false, confidence: 'High', timeSpentSeconds: 60 }),
        );
      }
      // Some high confidence correct for baseline
      for (let i = 0; i < 3; i++) {
        const q = makeQuestion({ id: `conf-hc-${i}`, topic: 'Ethics' });
        questions.push(q);
        questionAttempts.push(
          makeAttemptQuestion(`conf-hc-${i}`, { correct: true, confidence: 'High', timeSpentSeconds: 60 }),
        );
      }

      const attempts = [makePracticeAttempt(questionAttempts)];
      const patterns = detectAllPatterns(attempts, questions);

      if (patterns.length > 1) {
        // Verify sorted by severity
        const severityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < patterns.length; i++) {
          const prevSev = severityOrder[patterns[i - 1].severity];
          const currSev = severityOrder[patterns[i].severity];
          if (prevSev === currSev) {
            expect(patterns[i - 1].occurrenceCount).toBeGreaterThanOrEqual(patterns[i].occurrenceCount);
          } else {
            expect(prevSev).toBeLessThanOrEqual(currSev);
          }
        }
      }
    });
  });

  describe('detectConceptConfusion', () => {
    it('detects when student gets one topic right but misses a related topic', () => {
      const questions: Question[] = [];
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // Strong topic: Revenue Recognition (80% correct)
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `rev-${i}`, topic: 'Revenue Recognition', subject: 'FSA' });
        questions.push(q);
        attempts.push({
          attempt: makeAttemptQuestion(`rev-${i}`, { correct: i < 4, timeSpentSeconds: 60, confidence: 'Medium' }),
          question: q,
        });
      }

      // Weak topic: Expense Recognition (20% correct)
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `exp-${i}`, topic: 'Expense Recognition', subject: 'FSA' });
        questions.push(q);
        attempts.push({
          attempt: makeAttemptQuestion(`exp-${i}`, { correct: i === 0, timeSpentSeconds: 60, confidence: 'Medium' }),
          question: q,
        });
      }

      const patterns = detectConceptConfusion(attempts);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].patternType).toBe('conceptConfusion');
      expect(patterns[0].affectedTopics).toContain('Expense Recognition');
      expect(patterns[0].affectedTopics).toContain('Revenue Recognition');
    });

    it('does not flag when both topics have similar accuracy', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      for (let i = 0; i < 5; i++) {
        const q1 = makeQuestion({ id: `t1-${i}`, topic: 'Topic A', subject: 'FSA' });
        const q2 = makeQuestion({ id: `t2-${i}`, topic: 'Topic B', subject: 'FSA' });
        attempts.push(
          { attempt: makeAttemptQuestion(`t1-${i}`, { correct: i < 3, timeSpentSeconds: 60 }), question: q1 },
          { attempt: makeAttemptQuestion(`t2-${i}`, { correct: i < 3, timeSpentSeconds: 60 }), question: q2 },
        );
      }

      const patterns = detectConceptConfusion(attempts);
      expect(patterns.length).toBe(0);
    });
  });

  describe('detectTimePressureErrors', () => {
    it('detects when fast answers have higher error rate', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // Fast answers: 80% wrong
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `fast-${i}`, topic: 'Bonds' });
        attempts.push({
          attempt: makeAttemptQuestion(`fast-${i}`, {
            correct: i === 0,
            timeSpentSeconds: 15,
            confidence: 'Low',
          }),
          question: q,
        });
      }

      // Slow answers: 20% wrong
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `slow-${i}`, topic: 'Bonds' });
        attempts.push({
          attempt: makeAttemptQuestion(`slow-${i}`, {
            correct: i < 4,
            timeSpentSeconds: 90,
            confidence: 'Medium',
          }),
          question: q,
        });
      }

      const patterns = detectTimePressureErrors(attempts);
      expect(patterns.length).toBe(1);
      expect(patterns[0].patternType).toBe('timePressure');
      expect(patterns[0].occurrenceCount).toBe(4); // 4 fast wrong
      expect(patterns[0].description).toContain('under 30 seconds');
    });

    it('does not flag when error rates are similar', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // Both fast and slow have 50% error rate
      for (let i = 0; i < 4; i++) {
        const qFast = makeQuestion({ id: `f-${i}`, topic: 'X' });
        const qSlow = makeQuestion({ id: `s-${i}`, topic: 'X' });
        attempts.push(
          { attempt: makeAttemptQuestion(`f-${i}`, { correct: i < 2, timeSpentSeconds: 20 }), question: qFast },
          { attempt: makeAttemptQuestion(`s-${i}`, { correct: i < 2, timeSpentSeconds: 90 }), question: qSlow },
        );
      }

      const patterns = detectTimePressureErrors(attempts);
      expect(patterns.length).toBe(0);
    });
  });

  describe('detectCalculationErrors', () => {
    it('detects adjacent-answer selections indicating math mistakes', () => {
      const questions: Question[] = [];
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];
      const questionMap = new Map<string, Question>();

      // 5 questions where student picks answer adjacent to correct
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({
          id: `adj-${i}`,
          topic: 'TVM',
          answerChoices: [
            { label: 'A', text: 'Option A', isCorrect: false, explanation: '' },
            { label: 'B', text: 'Option B', isCorrect: true, explanation: '' },
            { label: 'C', text: 'Option C', isCorrect: false, explanation: '' },
          ],
        });
        questions.push(q);
        questionMap.set(q.id, q);
        attempts.push({
          attempt: makeAttemptQuestion(`adj-${i}`, { correct: false, selectedAnswer: 'C', timeSpentSeconds: 60 }),
          question: q,
        });
      }

      const patterns = detectCalculationErrors(attempts, questionMap);
      expect(patterns.length).toBe(1);
      expect(patterns[0].patternType).toBe('calculationError');
      expect(patterns[0].occurrenceCount).toBe(5);
      expect(patterns[0].description).toContain('adjacent to the correct answer');
    });

    it('does not flag when answers are not adjacent', () => {
      const questions: Question[] = [];
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];
      const questionMap = new Map<string, Question>();

      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({
          id: `non-adj-${i}`,
          topic: 'TVM',
          answerChoices: [
            { label: 'A', text: 'Option A', isCorrect: true, explanation: '' },
            { label: 'B', text: 'Option B', isCorrect: false, explanation: '' },
            { label: 'C', text: 'Option C', isCorrect: false, explanation: '' },
            { label: 'D', text: 'Option D', isCorrect: false, explanation: '' },
          ],
        });
        questions.push(q);
        questionMap.set(q.id, q);
        // Selected D when correct is A (not adjacent)
        attempts.push({
          attempt: makeAttemptQuestion(`non-adj-${i}`, { correct: false, selectedAnswer: 'D', timeSpentSeconds: 60 }),
          question: q,
        });
      }

      const patterns = detectCalculationErrors(attempts, questionMap);
      expect(patterns.length).toBe(0);
    });
  });

  describe('detectConfidenceMismatch', () => {
    it('detects high confidence wrong answers indicating misconceptions', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // 5 high confidence wrong
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `hcw-${i}`, topic: 'Derivatives' });
        attempts.push({
          attempt: makeAttemptQuestion(`hcw-${i}`, { correct: false, confidence: 'High', timeSpentSeconds: 60 }),
          question: q,
        });
      }
      // 5 high confidence correct (for baseline)
      for (let i = 0; i < 5; i++) {
        const q = makeQuestion({ id: `hcc-${i}`, topic: 'Bonds' });
        attempts.push({
          attempt: makeAttemptQuestion(`hcc-${i}`, { correct: true, confidence: 'High', timeSpentSeconds: 60 }),
          question: q,
        });
      }

      const patterns = detectConfidenceMismatch(attempts);
      expect(patterns.length).toBe(1);
      expect(patterns[0].patternType).toBe('confidenceMismatch');
      expect(patterns[0].occurrenceCount).toBe(5);
      expect(patterns[0].description).toContain('High');
      expect(patterns[0].description).toContain('50%'); // 5/10 = 50% mismatch
    });

    it('does not flag when high confidence is mostly correct', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // 1 high confidence wrong, 9 high confidence correct = 10% mismatch
      const qWrong = makeQuestion({ id: 'hcw-0', topic: 'Derivatives' });
      attempts.push({
        attempt: makeAttemptQuestion('hcw-0', { correct: false, confidence: 'High', timeSpentSeconds: 60 }),
        question: qWrong,
      });
      for (let i = 0; i < 9; i++) {
        const q = makeQuestion({ id: `hcc-${i}`, topic: 'Bonds' });
        attempts.push({
          attempt: makeAttemptQuestion(`hcc-${i}`, { correct: true, confidence: 'High', timeSpentSeconds: 60 }),
          question: q,
        });
      }

      const patterns = detectConfidenceMismatch(attempts);
      expect(patterns.length).toBe(0); // 10% < 20% threshold
    });
  });

  describe('detectFramingTraps', () => {
    it('detects when Easy questions are correct but Hard questions in same topic are wrong', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // Easy: 100% correct
      for (let i = 0; i < 4; i++) {
        const q = makeQuestion({ id: `easy-${i}`, topic: 'LIFO/FIFO', difficulty: 'Easy' });
        attempts.push({
          attempt: makeAttemptQuestion(`easy-${i}`, { correct: true, timeSpentSeconds: 45 }),
          question: q,
        });
      }

      // Hard: 25% correct (1/4)
      for (let i = 0; i < 4; i++) {
        const q = makeQuestion({ id: `hard-${i}`, topic: 'LIFO/FIFO', difficulty: 'Hard' });
        attempts.push({
          attempt: makeAttemptQuestion(`hard-${i}`, { correct: i === 0, timeSpentSeconds: 60 }),
          question: q,
        });
      }

      const patterns = detectFramingTraps(attempts);
      expect(patterns.length).toBe(1);
      expect(patterns[0].patternType).toBe('framingTrap');
      expect(patterns[0].affectedTopics).toContain('LIFO/FIFO');
      expect(patterns[0].description).toContain('Easy');
      expect(patterns[0].description).toContain('Hard');
    });
  });

  describe('severity assignment', () => {
    it('assigns high severity for frequent high-percentage patterns', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // Many high confidence wrong (6+ occurrences, 60%+ error)
      for (let i = 0; i < 8; i++) {
        const q = makeQuestion({ id: `sev-${i}`, topic: 'Fixed Income' });
        attempts.push({
          attempt: makeAttemptQuestion(`sev-${i}`, { correct: false, confidence: 'High', timeSpentSeconds: 60 }),
          question: q,
        });
      }
      // 3 correct for baseline (73% mismatch rate)
      for (let i = 0; i < 3; i++) {
        const q = makeQuestion({ id: `sev-c-${i}`, topic: 'Fixed Income' });
        attempts.push({
          attempt: makeAttemptQuestion(`sev-c-${i}`, { correct: true, confidence: 'High', timeSpentSeconds: 60 }),
          question: q,
        });
      }

      const patterns = detectConfidenceMismatch(attempts);
      expect(patterns.length).toBe(1);
      expect(patterns[0].severity).toBe('high');
    });
  });

  describe('occurrence counting', () => {
    it('correctly counts pattern occurrences', () => {
      const attempts: { attempt: AttemptQuestion; question: Question }[] = [];

      // 7 fast wrong answers
      for (let i = 0; i < 7; i++) {
        const q = makeQuestion({ id: `count-fast-${i}`, topic: 'Ethics' });
        attempts.push({
          attempt: makeAttemptQuestion(`count-fast-${i}`, { correct: false, timeSpentSeconds: 20 }),
          question: q,
        });
      }
      // 7 slow correct
      for (let i = 0; i < 7; i++) {
        const q = makeQuestion({ id: `count-slow-${i}`, topic: 'Ethics' });
        attempts.push({
          attempt: makeAttemptQuestion(`count-slow-${i}`, { correct: true, timeSpentSeconds: 90 }),
          question: q,
        });
      }

      const patterns = detectTimePressureErrors(attempts);
      expect(patterns.length).toBe(1);
      expect(patterns[0].occurrenceCount).toBe(7);
    });
  });
});
