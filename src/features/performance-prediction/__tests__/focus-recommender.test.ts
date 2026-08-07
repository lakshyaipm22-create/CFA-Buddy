import { describe, it, expect, vi } from 'vitest';
import type { PracticeAttempt, AttemptQuestion, ModuleResult } from '@/features/question-bank/types/attempt';
import { computeFocusRecommendations } from '../utils/focus-recommender';

// Mock question-loader
vi.mock('@/features/question-bank/utils/question-loader', () => ({
  getQuestionCountBySubject: () => questionCounts,
}));

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

function createAttempt(
  subject: string,
  accuracy: number,
  questionCount: number = 20
): PracticeAttempt {
  const correctQs = Math.round(questionCount * (accuracy / 100));

  const questionAttempts: AttemptQuestion[] = Array.from({ length: questionCount }, (_, j) => ({
    questionId: `q-${subject}-${j}`,
    selectedAnswer: 'A',
    correct: j < correctQs,
    timeSpentSeconds: 70,
    confidence: 'Medium' as const,
  }));

  const moduleResult: ModuleResult = {
    moduleId: `m-${subject}`,
    moduleName: `${subject} Module`,
    score: correctQs,
    total: questionCount,
    percentage: Math.round((correctQs / questionCount) * 100),
    avgTimePerQuestion: 70,
    questionAttempts,
  };

  return {
    id: `attempt-${subject}-${Math.random().toString(36).slice(2)}`,
    subjectName: subject,
    attemptNumber: 1,
    completedAt: new Date().toISOString(),
    moduleResults: [moduleResult],
    overallScore: correctQs,
    overallTotal: questionCount,
    overallPercentage: Math.round((correctQs / questionCount) * 100),
    avgTimePerQuestion: 70,
    bookmarkedIds: [],
    confidenceLevel: accuracy >= 80 ? 'High' : accuracy >= 60 ? 'Medium' : 'Low',
  };
}

describe('focus-recommender', () => {
  describe('computeFocusRecommendations', () => {
    it('returns default recommendations for no data', () => {
      const recs = computeFocusRecommendations([], questionCounts);
      expect(recs).toHaveLength(5);
      // Should recommend highest-weight subjects first
      expect(recs[0].curriculumWeight).toBeGreaterThanOrEqual(recs[1].curriculumWeight);
      expect(recs[0].priority).toBe(1);
      expect(recs[4].priority).toBe(5);
    });

    it('recommends lowest-accuracy high-weight subjects first', () => {
      // Ethics: 15% weight, 40% accuracy (big gap, high weight)
      // FSA: 13% weight, 45% accuracy (big gap, high weight)
      // Quant: 8% weight, 90% accuracy (no gap, low weight)
      const attempts = [
        createAttempt('Ethical and Professional Standards', 40),
        createAttempt('Financial Statement Analysis', 45),
        createAttempt('Quantitative Methods', 90),
        createAttempt('Equity Investments', 85),
        createAttempt('Fixed Income', 80),
      ];

      const recs = computeFocusRecommendations(attempts, questionCounts);

      // Ethics should be recommended (high weight + low accuracy)
      const ethicsRec = recs.find(r => r.subject === 'Ethical and Professional Standards');
      expect(ethicsRec).toBeDefined();

      // FSA should be recommended (high weight + low accuracy)
      const fsaRec = recs.find(r => r.subject === 'Financial Statement Analysis');
      expect(fsaRec).toBeDefined();

      // High-accuracy subjects should not be priority recommendations
      const quantRec = recs.find(r => r.subject === 'Quantitative Methods' && r.topic === null);
      // Quant is at 90%, above MPS, so may not appear or will be low priority
      if (quantRec) {
        expect(quantRec.priority).toBeGreaterThan(2);
      }
    });

    it('limits to 5 recommendations', () => {
      // All subjects at low accuracy
      const attempts = [
        createAttempt('Quantitative Methods', 30),
        createAttempt('Economics', 35),
        createAttempt('Corporate Issuers', 40),
        createAttempt('Financial Statement Analysis', 25),
        createAttempt('Equity Investments', 30),
        createAttempt('Fixed Income', 35),
        createAttempt('Derivatives', 40),
        createAttempt('Alternative Investments', 45),
        createAttempt('Portfolio Management', 50),
        createAttempt('Ethical and Professional Standards', 35),
      ];

      const recs = computeFocusRecommendations(attempts, questionCounts);
      expect(recs.length).toBeLessThanOrEqual(5);
    });

    it('handles no data gracefully', () => {
      const recs = computeFocusRecommendations([], {});
      expect(recs).toHaveLength(5);
      recs.forEach(rec => {
        expect(rec.subject).toBeTruthy();
        expect(rec.priority).toBeGreaterThanOrEqual(1);
        expect(rec.priority).toBeLessThanOrEqual(5);
      });
    });

    it('curriculum weights affect priority order', () => {
      // Two subjects with same accuracy but different weights
      // Ethics (15%) and Derivatives (6%) both at 50% accuracy
      const attempts = [
        createAttempt('Ethical and Professional Standards', 50),
        createAttempt('Derivatives', 50),
      ];

      const recs = computeFocusRecommendations(attempts, questionCounts);

      const ethicsRec = recs.find(r => r.subject === 'Ethical and Professional Standards');
      const derivRec = recs.find(r => r.subject === 'Derivatives');

      // Ethics has higher weight, so should have higher expected impact
      if (ethicsRec && derivRec) {
        expect(ethicsRec.expectedImpact).toBeGreaterThan(derivRec.expectedImpact);
      }
    });

    it('includes unpracticed high-weight subjects', () => {
      // Only practice Quant (8% weight), leaving Ethics (15%) untouched
      const attempts = [createAttempt('Quantitative Methods', 75)];

      const recs = computeFocusRecommendations(attempts, questionCounts);

      // Ethics should appear since it has highest weight and 0 attempts
      const ethicsRec = recs.find(r => r.subject === 'Ethical and Professional Standards');
      expect(ethicsRec).toBeDefined();
    });

    it('assigns sequential priorities starting from 1', () => {
      const attempts = [
        createAttempt('Quantitative Methods', 50),
        createAttempt('Economics', 40),
      ];

      const recs = computeFocusRecommendations(attempts, questionCounts);
      recs.forEach((rec, idx) => {
        expect(rec.priority).toBe(idx + 1);
      });
    });

    it('provides meaningful reasons', () => {
      const attempts = [createAttempt('Quantitative Methods', 50)];
      const recs = computeFocusRecommendations(attempts, questionCounts);

      recs.forEach(rec => {
        expect(rec.reason).toBeTruthy();
        expect(rec.reason.length).toBeGreaterThan(10);
      });
    });
  });
});
