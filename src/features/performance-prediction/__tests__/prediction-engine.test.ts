import { describe, it, expect, vi } from 'vitest';
import type { PracticeAttempt, AttemptQuestion, ModuleResult } from '@/features/question-bank/types/attempt';
import { computePassProbability, computeTrendDirection, computeTrendData, computeConsistency } from '../utils/prediction-engine';

// Mock question-loader to avoid localStorage dependency
vi.mock('@/features/question-bank/utils/question-loader', () => ({
  getQuestionCountBySubject: () => ({
    'Quantitative Methods': 100,
    'Economics': 80,
    'Corporate Issuers': 60,
    'Financial Statement Analysis': 120,
    'Equity Investments': 100,
    'Fixed Income': 100,
    'Derivatives': 50,
    'Alternative Investments': 50,
    'Portfolio Management': 80,
    'Ethical and Professional Standards': 100,
  }),
}));

function createAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  const qa: AttemptQuestion = {
    questionId: `q-${Math.random().toString(36).slice(2)}`,
    selectedAnswer: 'A',
    correct: true,
    timeSpentSeconds: 60,
    confidence: 'Medium',
  };

  const moduleResult: ModuleResult = {
    moduleId: 'm1',
    moduleName: 'Module 1',
    score: 8,
    total: 10,
    percentage: 80,
    avgTimePerQuestion: 60,
    questionAttempts: Array.from({ length: 10 }, (_, i) => ({
      ...qa,
      questionId: `q-${i}-${Math.random().toString(36).slice(2)}`,
      correct: i < 8,
    })),
  };

  return {
    id: `attempt-${Math.random().toString(36).slice(2)}`,
    subjectName: 'Quantitative Methods',
    attemptNumber: 1,
    completedAt: new Date().toISOString(),
    moduleResults: [moduleResult],
    overallScore: 8,
    overallTotal: 10,
    overallPercentage: 80,
    avgTimePerQuestion: 60,
    bookmarkedIds: [],
    confidenceLevel: 'High',
    ...overrides,
  };
}

function createMultiSubjectAttempts(accuracy: number, coverage: number): PracticeAttempt[] {
  const subjects = [
    'Quantitative Methods',
    'Economics',
    'Corporate Issuers',
    'Financial Statement Analysis',
    'Equity Investments',
    'Fixed Income',
    'Derivatives',
    'Alternative Investments',
    'Portfolio Management',
    'Ethical and Professional Standards',
  ];

  const attempts: PracticeAttempt[] = [];
  const subjectsToUse = Math.ceil(subjects.length * coverage);

  for (let i = 0; i < subjectsToUse; i++) {
    // Use enough questions to represent meaningful coverage
    const availableForSubject = questionCounts[subjects[i]] ?? 100;
    const totalQs = Math.round(availableForSubject * 0.5); // 50% of available bank
    const correctQs = Math.round(totalQs * (accuracy / 100));

    const questionAttempts: AttemptQuestion[] = Array.from({ length: totalQs }, (_, j) => ({
      questionId: `q-${subjects[i]}-${j}`,
      selectedAnswer: 'A',
      correct: j < correctQs,
      timeSpentSeconds: 70,
      confidence: 'Medium' as const,
    }));

    attempts.push(createAttempt({
      subjectName: subjects[i],
      overallScore: correctQs,
      overallTotal: totalQs,
      overallPercentage: Math.round((correctQs / totalQs) * 100),
      moduleResults: [{
        moduleId: `m-${subjects[i]}`,
        moduleName: `${subjects[i]} Module`,
        score: correctQs,
        total: totalQs,
        percentage: Math.round((correctQs / totalQs) * 100),
        avgTimePerQuestion: 70,
        questionAttempts,
      }],
      completedAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));
  }

  return attempts;
}

const questionCounts: Record<string, number> = {
  'Quantitative Methods': 100,
  'Economics': 80,
  'Corporate Issuers': 60,
  'Financial Statement Analysis': 120,
  'Equity Investments': 100,
  'Fixed Income': 100,
  'Derivatives': 50,
  'Alternative Investments': 50,
  'Portfolio Management': 80,
  'Ethical and Professional Standards': 100,
};

describe('prediction-engine', () => {
  describe('computePassProbability', () => {
    it('returns 0% probability for zero attempts', () => {
      const result = computePassProbability([], questionCounts);
      expect(result.passProb).toBe(0);
      expect(result.confidenceInterval).toEqual([0, 0]);
      expect(result.trendDirection).toBe('stable');
      expect(result.factors).toHaveLength(5);
      expect(result.factors.every(f => f.score === 0)).toBe(true);
    });

    it('returns probability > 70% for high accuracy + full coverage', () => {
      const attempts = createMultiSubjectAttempts(85, 1.0);
      const result = computePassProbability(attempts, questionCounts);
      expect(result.passProb).toBeGreaterThan(70);
    });

    it('penalizes high accuracy with low coverage', () => {
      const highAccHighCoverage = createMultiSubjectAttempts(85, 1.0);
      const highAccLowCoverage = createMultiSubjectAttempts(85, 0.3);

      const resultFull = computePassProbability(highAccHighCoverage, questionCounts);
      const resultLow = computePassProbability(highAccLowCoverage, questionCounts);

      expect(resultFull.passProb).toBeGreaterThan(resultLow.passProb);
    });

    it('gives declining trend lower probability than improving trend', () => {
      // Declining: early attempts high, recent low
      const declining: PracticeAttempt[] = [];
      for (let i = 0; i < 6; i++) {
        const isEarly = i < 3;
        const accuracy = isEarly ? 85 : 55;
        const totalQs = 20;
        const correctQs = Math.round(totalQs * (accuracy / 100));

        declining.push(createAttempt({
          subjectName: 'Quantitative Methods',
          overallScore: correctQs,
          overallTotal: totalQs,
          overallPercentage: Math.round((correctQs / totalQs) * 100),
          completedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
          moduleResults: [{
            moduleId: 'm1',
            moduleName: 'Module 1',
            score: correctQs,
            total: totalQs,
            percentage: Math.round((correctQs / totalQs) * 100),
            avgTimePerQuestion: 70,
            questionAttempts: Array.from({ length: totalQs }, (_, j) => ({
              questionId: `q-dec-${i}-${j}`,
              selectedAnswer: 'A',
              correct: j < correctQs,
              timeSpentSeconds: 70,
              confidence: 'Medium' as const,
            })),
          }],
        }));
      }

      // Improving: early attempts low, recent high
      const improving: PracticeAttempt[] = [];
      for (let i = 0; i < 6; i++) {
        const isEarly = i < 3;
        const accuracy = isEarly ? 55 : 85;
        const totalQs = 20;
        const correctQs = Math.round(totalQs * (accuracy / 100));

        improving.push(createAttempt({
          subjectName: 'Quantitative Methods',
          overallScore: correctQs,
          overallTotal: totalQs,
          overallPercentage: Math.round((correctQs / totalQs) * 100),
          completedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
          moduleResults: [{
            moduleId: 'm1',
            moduleName: 'Module 1',
            score: correctQs,
            total: totalQs,
            percentage: Math.round((correctQs / totalQs) * 100),
            avgTimePerQuestion: 70,
            questionAttempts: Array.from({ length: totalQs }, (_, j) => ({
              questionId: `q-imp-${i}-${j}`,
              selectedAnswer: 'A',
              correct: j < correctQs,
              timeSpentSeconds: 70,
              confidence: 'Medium' as const,
            })),
          }],
        }));
      }

      const resultDeclining = computePassProbability(declining, questionCounts);
      const resultImproving = computePassProbability(improving, questionCounts);

      expect(resultImproving.passProb).toBeGreaterThan(resultDeclining.passProb);
    });

    it('gives > 85% for consistent high performer with full coverage', () => {
      // Create a consistent high performer: 90%+ accuracy across all subjects
      const attempts = createMultiSubjectAttempts(92, 1.0);
      // Add more attempts to boost consistency signal
      const moreAttempts = createMultiSubjectAttempts(90, 1.0).map((a, i) => ({
        ...a,
        id: `extra-${i}`,
        completedAt: new Date(Date.now() - (i + 10) * 86400000).toISOString(),
      }));

      const allAttempts = [...attempts, ...moreAttempts];
      const result = computePassProbability(allAttempts, questionCounts);
      expect(result.passProb).toBeGreaterThanOrEqual(85);
    });

    it('produces valid factor structure', () => {
      const attempts = createMultiSubjectAttempts(70, 0.5);
      const result = computePassProbability(attempts, questionCounts);

      expect(result.factors).toHaveLength(5);

      const totalWeight = result.factors.reduce((s, f) => s + f.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);

      for (const factor of result.factors) {
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
        expect(factor.name).toBeTruthy();
        expect(factor.impactDescription).toBeTruthy();
      }
    });

    it('returns passProb between 0 and 100', () => {
      const attempts = createMultiSubjectAttempts(50, 0.5);
      const result = computePassProbability(attempts, questionCounts);
      expect(result.passProb).toBeGreaterThanOrEqual(0);
      expect(result.passProb).toBeLessThanOrEqual(100);
    });
  });

  describe('computeTrendDirection', () => {
    it('returns stable for fewer than 3 attempts', () => {
      const attempts = [createAttempt(), createAttempt()];
      expect(computeTrendDirection(attempts)).toBe('stable');
    });

    it('detects improving trend', () => {
      const attempts = Array.from({ length: 6 }, (_, i) => createAttempt({
        overallPercentage: 50 + i * 10,
        completedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
      }));
      expect(computeTrendDirection(attempts)).toBe('improving');
    });

    it('detects declining trend', () => {
      const attempts = Array.from({ length: 6 }, (_, i) => createAttempt({
        overallPercentage: 90 - i * 10,
        completedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
      }));
      expect(computeTrendDirection(attempts)).toBe('declining');
    });

    it('returns stable for flat performance', () => {
      const attempts = Array.from({ length: 6 }, (_, i) => createAttempt({
        overallPercentage: 70,
        completedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
      }));
      expect(computeTrendDirection(attempts)).toBe('stable');
    });
  });

  describe('computeTrendData', () => {
    it('returns empty for no attempts', () => {
      expect(computeTrendData([], 7)).toEqual([]);
    });

    it('groups by date within window', () => {
      const now = new Date();
      const attempts = [
        createAttempt({
          completedAt: now.toISOString(),
          overallScore: 8,
          overallTotal: 10,
        }),
        createAttempt({
          completedAt: now.toISOString(),
          overallScore: 6,
          overallTotal: 10,
        }),
      ];

      const data = computeTrendData(attempts, 7);
      expect(data).toHaveLength(1);
      expect(data[0].accuracy).toBe(70); // (8+6)/(10+10) = 70%
      expect(data[0].questionCount).toBe(20);
    });

    it('filters out attempts outside window', () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 40 * 86400000);
      const attempts = [
        createAttempt({ completedAt: now.toISOString() }),
        createAttempt({ completedAt: oldDate.toISOString() }),
      ];

      const data = computeTrendData(attempts, 30);
      expect(data).toHaveLength(1);
    });
  });

  describe('computeConsistency', () => {
    it('returns 50 for single attempt', () => {
      const attempts = [createAttempt({ overallPercentage: 70 })];
      expect(computeConsistency(attempts)).toBe(50);
    });

    it('returns high score for consistent performance', () => {
      const attempts = Array.from({ length: 10 }, () =>
        createAttempt({ overallPercentage: 72 })
      );
      expect(computeConsistency(attempts)).toBeGreaterThan(90);
    });

    it('returns low score for highly variable performance', () => {
      const attempts = Array.from({ length: 10 }, (_, i) =>
        createAttempt({ overallPercentage: i % 2 === 0 ? 30 : 95 })
      );
      expect(computeConsistency(attempts)).toBeLessThan(30);
    });
  });
});
