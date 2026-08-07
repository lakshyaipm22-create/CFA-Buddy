import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PracticeAttempt, AttemptQuestion } from '@/features/question-bank/types/attempt';
import type { Question } from '@/features/question-bank/types';
import type { MistakePattern } from '../types';
import { generateOverallInsight, generatePatternInsight } from '../utils/insight-generator';

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

beforeEach(() => {
  localStorageMock.clear();
});

function makePattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: 'test-pattern',
    patternType: 'conceptConfusion',
    description: 'Test pattern description with 75% error rate',
    affectedTopics: ['LIFO/FIFO', 'Inventory Valuation'],
    occurrenceCount: 5,
    examples: [],
    severity: 'high',
    recommendation: 'Review the differences between these concepts.',
    percentage: 75,
    ...overrides,
  };
}

function makePracticeAttempt(qas: AttemptQuestion[]): PracticeAttempt {
  return {
    id: `attempt-${Math.random().toString(36).slice(2, 8)}`,
    subjectName: 'FSA',
    attemptNumber: 1,
    completedAt: '2025-01-15T10:00:00Z',
    moduleResults: [{
      moduleId: 'mod-1',
      moduleName: 'Test Module',
      score: qas.filter(q => q.correct).length,
      total: qas.length,
      percentage: 0,
      avgTimePerQuestion: 60,
      questionAttempts: qas,
    }],
    overallScore: 0,
    overallTotal: qas.length,
    overallPercentage: 0,
    avgTimePerQuestion: 60,
    bookmarkedIds: [],
    confidenceLevel: 'Medium',
  };
}

describe('Insight Generator', () => {
  describe('generateOverallInsight', () => {
    it('generates specific human-readable insights', () => {
      const patterns: MistakePattern[] = [
        makePattern({
          patternType: 'conceptConfusion',
          severity: 'high',
          affectedTopics: ['LIFO/FIFO', 'Revenue Recognition'],
          occurrenceCount: 7,
        }),
        makePattern({
          id: 'tp',
          patternType: 'timePressure',
          severity: 'medium',
          affectedTopics: ['Bonds'],
          occurrenceCount: 4,
        }),
      ];

      const attempts: PracticeAttempt[] = [
        makePracticeAttempt([
          { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 60, confidence: 'Medium' },
        ]),
      ];

      const insight = generateOverallInsight(patterns, attempts);
      expect(insight).toBeTruthy();
      expect(insight.length).toBeGreaterThan(20);
      expect(insight).toContain('concept confusion');
      expect(insight).toContain('LIFO/FIFO');
      // Should mention time pressure
      expect(insight).toContain('Time pressure');
    });

    it('includes actual numbers (pattern counts)', () => {
      const patterns: MistakePattern[] = [
        makePattern({ occurrenceCount: 5 }),
        makePattern({ id: 'p2', occurrenceCount: 3, patternType: 'timePressure' }),
      ];
      const attempts: PracticeAttempt[] = [makePracticeAttempt([
        { questionId: 'q1', selectedAnswer: 'A', correct: false, timeSpentSeconds: 60, confidence: 'Medium' },
      ])];

      const insight = generateOverallInsight(patterns, attempts);
      expect(insight).toContain('2 patterns');
      expect(insight).toContain('8 occurrences');
    });

    it('handles no patterns case', () => {
      const insight = generateOverallInsight([], []);
      expect(insight).toContain('Complete some practice sessions');
    });

    it('handles attempts but no patterns', () => {
      const attempts: PracticeAttempt[] = [
        makePracticeAttempt([
          { questionId: 'q1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 60, confidence: 'High' },
        ]),
      ];
      const insight = generateOverallInsight([], attempts);
      expect(insight).toContain('No significant mistake patterns');
    });
  });

  describe('generatePatternInsight', () => {
    it('generates specific insight for concept confusion', () => {
      const pattern = makePattern({ patternType: 'conceptConfusion' });
      const insight = generatePatternInsight(pattern);
      expect(insight).toContain('Concept confusion');
      expect(insight).toContain('5 instances');
    });

    it('generates specific insight for time pressure', () => {
      const pattern = makePattern({ patternType: 'timePressure', description: 'Error rate 2x higher under 30s' });
      const insight = generatePatternInsight(pattern);
      expect(insight).toContain('Time pressure');
    });

    it('generates specific insight for calculation errors', () => {
      const pattern = makePattern({ patternType: 'calculationError', description: '45% adjacent answers' });
      const insight = generatePatternInsight(pattern);
      expect(insight).toContain('Calculation errors');
      expect(insight).toContain('Double-check');
    });

    it('generates specific insight for confidence mismatch', () => {
      const pattern = makePattern({ patternType: 'confidenceMismatch', description: '50% mismatch rate' });
      const insight = generatePatternInsight(pattern);
      expect(insight).toContain('Overconfidence');
    });

    it('generates specific insight for framing traps', () => {
      const pattern = makePattern({ patternType: 'framingTrap', description: 'Easy 90% vs Hard 30%' });
      const insight = generatePatternInsight(pattern);
      expect(insight).toContain('Framing sensitivity');
      expect(insight).toContain('Practice with varied question styles');
    });

    it('handles edge case of single occurrence pattern', () => {
      const pattern = makePattern({ occurrenceCount: 1 });
      const insight = generatePatternInsight(pattern);
      expect(insight).toBeTruthy();
      expect(insight.length).toBeGreaterThan(0);
    });
  });
});
