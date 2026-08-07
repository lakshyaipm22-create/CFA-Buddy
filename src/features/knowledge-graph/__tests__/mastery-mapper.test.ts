import { describe, it, expect } from 'vitest';
import {
  computeAllNodeMastery,
  getNodeMasteryFromAttempts,
  getMasteryMap,
} from '../utils/mastery-mapper';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import { CONCEPT_NODES } from '../data/concept-map';

function makeAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: `attempt-${Math.random().toString(36).slice(2)}`,
    subjectName: 'Quantitative Methods',
    attemptNumber: 1,
    completedAt: new Date().toISOString(),
    moduleResults: [
      {
        moduleId: 'mod-1',
        moduleName: 'Rates and Returns',
        score: 8,
        total: 10,
        percentage: 80,
        avgTimePerQuestion: 45,
        questionAttempts: [
          { questionId: 'q1', selectedAnswer: 'B', correct: true, timeSpentSeconds: 40, confidence: 'High' },
          { questionId: 'q2', selectedAnswer: 'A', correct: true, timeSpentSeconds: 50, confidence: 'Medium' },
          { questionId: 'q3', selectedAnswer: 'C', correct: false, timeSpentSeconds: 60, confidence: 'Low' },
          { questionId: 'q4', selectedAnswer: 'B', correct: true, timeSpentSeconds: 35, confidence: 'High' },
          { questionId: 'q5', selectedAnswer: 'A', correct: true, timeSpentSeconds: 42, confidence: 'Medium' },
          { questionId: 'q6', selectedAnswer: 'B', correct: true, timeSpentSeconds: 55, confidence: 'High' },
          { questionId: 'q7', selectedAnswer: 'A', correct: true, timeSpentSeconds: 38, confidence: 'High' },
          { questionId: 'q8', selectedAnswer: 'C', correct: true, timeSpentSeconds: 44, confidence: 'Medium' },
          { questionId: 'q9', selectedAnswer: 'B', correct: false, timeSpentSeconds: 70, confidence: 'Low' },
          { questionId: 'q10', selectedAnswer: 'A', correct: true, timeSpentSeconds: 48, confidence: 'High' },
        ],
      },
    ],
    overallScore: 8,
    overallTotal: 10,
    overallPercentage: 80,
    avgTimePerQuestion: 45,
    bookmarkedIds: [],
    confidenceLevel: 'High',
    ...overrides,
  };
}

describe('mastery-mapper', () => {
  describe('computeAllNodeMastery', () => {
    it('returns mastery status for all concept nodes', () => {
      const attempts = [makeAttempt()];
      const result = computeAllNodeMastery(attempts);

      expect(result.length).toBe(CONCEPT_NODES.length);
    });

    it('maps practice attempts to matching concept nodes', () => {
      const attempts = [makeAttempt()];
      const result = computeAllNodeMastery(attempts);

      // The module "Rates and Returns" should map to the tvm node (topic: "Rates and Returns")
      const tvmMastery = result.find((m) => m.nodeId === 'tvm');
      expect(tvmMastery).toBeDefined();
      expect(tvmMastery!.questionsAnswered).toBeGreaterThan(0);
      expect(tvmMastery!.mastery).toBeGreaterThan(0);
    });

    it('returns zero mastery for nodes with no matching attempts', () => {
      const attempts = [makeAttempt({ subjectName: 'Quantitative Methods' })];
      const result = computeAllNodeMastery(attempts);

      // Derivatives nodes should have no data
      const derivMastery = result.find((m) => m.nodeId === 'derivative-basics');
      expect(derivMastery).toBeDefined();
      expect(derivMastery!.questionsAnswered).toBe(0);
      expect(derivMastery!.mastery).toBe(0);
    });

    it('handles empty attempts array', () => {
      const result = computeAllNodeMastery([]);
      expect(result.length).toBe(CONCEPT_NODES.length);
      expect(result.every((m) => m.mastery === 0)).toBe(true);
      expect(result.every((m) => m.questionsAnswered === 0)).toBe(true);
    });

    it('aggregates across multiple attempts', () => {
      const attempt1 = makeAttempt({ completedAt: '2024-01-01T00:00:00Z' });
      const attempt2 = makeAttempt({ completedAt: '2024-02-01T00:00:00Z' });

      const result = computeAllNodeMastery([attempt1, attempt2]);
      const tvmMastery = result.find((m) => m.nodeId === 'tvm');
      expect(tvmMastery).toBeDefined();
      // Should have more questions answered with two attempts
      expect(tvmMastery!.questionsAnswered).toBeGreaterThan(10);
    });

    it('handles topics with no matching node gracefully', () => {
      const attempt = makeAttempt();
      attempt.moduleResults = [
        {
          moduleId: 'mod-x',
          moduleName: 'Unknown Topic That Does Not Match Anything',
          score: 5,
          total: 5,
          percentage: 100,
          avgTimePerQuestion: 30,
          questionAttempts: [
            { questionId: 'qx1', selectedAnswer: 'A', correct: true, timeSpentSeconds: 30, confidence: 'High' },
          ],
        },
      ];

      // Should not throw
      const result = computeAllNodeMastery([attempt]);
      expect(result.length).toBe(CONCEPT_NODES.length);
    });
  });

  describe('getNodeMasteryFromAttempts', () => {
    it('returns mastery for a specific node', () => {
      const attempts = [makeAttempt()];
      const result = getNodeMasteryFromAttempts('tvm', attempts);

      expect(result.nodeId).toBe('tvm');
      expect(result.questionsAnswered).toBeGreaterThan(0);
    });

    it('returns zero for node with no matching data', () => {
      const attempts = [makeAttempt({ subjectName: 'Quantitative Methods' })];
      const result = getNodeMasteryFromAttempts('derivative-basics', attempts);

      expect(result.nodeId).toBe('derivative-basics');
      expect(result.mastery).toBe(0);
      expect(result.questionsAnswered).toBe(0);
    });
  });

  describe('getMasteryMap', () => {
    it('returns a map with all concept node IDs', () => {
      const attempts = [makeAttempt()];
      const map = getMasteryMap(attempts);

      expect(map.size).toBe(CONCEPT_NODES.length);
      for (const node of CONCEPT_NODES) {
        expect(map.has(node.id)).toBe(true);
      }
    });

    it('provides quick lookup by node ID', () => {
      const attempts = [makeAttempt()];
      const map = getMasteryMap(attempts);

      const tvmMastery = map.get('tvm');
      expect(tvmMastery).toBeDefined();
      expect(tvmMastery!.nodeId).toBe('tvm');
    });
  });
});
