import { describe, it, expect } from 'vitest';
import {
  identifyWeakestTopics,
  getWeakTopicQuestionDetails,
  generateMiniQuiz,
} from '../utils/weak-topics';
import type { PracticeAttempt } from '../types/attempt';
import type { Question } from '../types/index';

// Helper: create a question
function makeQuestion(id: string, topic: string, subject = 'Test Subject'): Question {
  return {
    id,
    questionText: `Question ${id} about ${topic}`,
    answerChoices: [
      { label: 'A', text: 'Choice A', isCorrect: true, explanation: 'A is correct because of reasons.' },
      { label: 'B', text: 'Choice B', isCorrect: false, explanation: 'B is incorrect.' },
      { label: 'C', text: 'Choice C', isCorrect: false, explanation: 'C is incorrect.' },
    ],
    difficulty: 'Medium',
    subject,
    reading: null,
    topic,
    provider: 'test',
    questionSourceFile: null,
  };
}

// Helper: create an attempt with specific correct/incorrect results
function makeAttempt(
  id: string,
  results: { questionId: string; correct: boolean }[]
): PracticeAttempt {
  return {
    id,
    subjectName: 'Test Subject',
    attemptNumber: 1,
    completedAt: '2025-06-15T12:00:00Z',
    moduleResults: [
      {
        moduleId: 'mod-1',
        moduleName: 'Test Module',
        score: results.filter(r => r.correct).length,
        total: results.length,
        percentage: Math.round(
          (results.filter(r => r.correct).length / results.length) * 100
        ),
        avgTimePerQuestion: 60,
        questionAttempts: results.map(r => ({
          questionId: r.questionId,
          selectedAnswer: r.correct ? 'A' : 'B',
          correct: r.correct,
          timeSpentSeconds: 60,
          confidence: 'Medium' as const,
        })),
      },
    ],
    overallScore: results.filter(r => r.correct).length,
    overallTotal: results.length,
    overallPercentage: Math.round(
      (results.filter(r => r.correct).length / results.length) * 100
    ),
    avgTimePerQuestion: 60,
    bookmarkedIds: [],
    confidenceLevel: 'Medium',
  };
}

describe('weak-topics', () => {
  const questions: Question[] = [
    // Topic A: 4 questions
    makeQuestion('a1', 'Topic A'),
    makeQuestion('a2', 'Topic A'),
    makeQuestion('a3', 'Topic A'),
    makeQuestion('a4', 'Topic A'),
    // Topic B: 3 questions
    makeQuestion('b1', 'Topic B'),
    makeQuestion('b2', 'Topic B'),
    makeQuestion('b3', 'Topic B'),
    // Topic C: 3 questions
    makeQuestion('c1', 'Topic C'),
    makeQuestion('c2', 'Topic C'),
    makeQuestion('c3', 'Topic C'),
    // Topic D: 2 questions
    makeQuestion('d1', 'Topic D'),
    makeQuestion('d2', 'Topic D'),
  ];

  describe('identifyWeakestTopics', () => {
    it('identifies the weakest topics sorted by accuracy ascending', () => {
      const attempts = [
        makeAttempt('att-1', [
          // Topic A: 1/4 correct = 25%
          { questionId: 'a1', correct: true },
          { questionId: 'a2', correct: false },
          { questionId: 'a3', correct: false },
          { questionId: 'a4', correct: false },
          // Topic B: 2/3 correct = 67%
          { questionId: 'b1', correct: true },
          { questionId: 'b2', correct: true },
          { questionId: 'b3', correct: false },
          // Topic C: 3/3 correct = 100%
          { questionId: 'c1', correct: true },
          { questionId: 'c2', correct: true },
          { questionId: 'c3', correct: true },
          // Topic D: 0/2 correct = 0%
          { questionId: 'd1', correct: false },
          { questionId: 'd2', correct: false },
        ]),
      ];

      const result = identifyWeakestTopics(attempts, questions, 3);
      expect(result).toHaveLength(3);

      // Weakest first: Topic D (0%), Topic A (25%), Topic B (67%)
      expect(result[0].topic).toBe('Topic D');
      expect(result[0].accuracy).toBe(0);
      expect(result[0].incorrectQuestionIds).toEqual(['d1', 'd2']);

      expect(result[1].topic).toBe('Topic A');
      expect(result[1].accuracy).toBe(25);
      expect(result[1].incorrectQuestionIds).toHaveLength(3);

      expect(result[2].topic).toBe('Topic B');
      expect(result[2].accuracy).toBe(67);
    });

    it('respects the topN parameter', () => {
      const attempts = [
        makeAttempt('att-1', [
          { questionId: 'a1', correct: false },
          { questionId: 'b1', correct: false },
          { questionId: 'c1', correct: false },
          { questionId: 'd1', correct: false },
        ]),
      ];

      const result = identifyWeakestTopics(attempts, questions, 2);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no attempts provided', () => {
      const result = identifyWeakestTopics([], questions);
      expect(result).toEqual([]);
    });

    it('filters out topics with "Unknown" name', () => {
      const unknownQ = makeQuestion('u1', 'Unknown Topic');
      // Manually set topic to null (which maps to Unknown)
      (unknownQ as { topic: string | null }).topic = null;

      const attempts = [
        makeAttempt('att-1', [
          { questionId: 'u1', correct: false },
          { questionId: 'a1', correct: false },
        ]),
      ];

      const result = identifyWeakestTopics(attempts, [...questions, unknownQ], 5);
      // Should not include "Unknown" topic
      expect(result.every(t => t.topic !== 'Unknown')).toBe(true);
    });

    it('aggregates across multiple attempts', () => {
      const attempts = [
        makeAttempt('att-1', [
          { questionId: 'a1', correct: true },
          { questionId: 'a2', correct: false },
        ]),
        makeAttempt('att-2', [
          { questionId: 'a3', correct: true },
          { questionId: 'a4', correct: false },
        ]),
      ];

      const result = identifyWeakestTopics(attempts, questions, 1);
      // Topic A: 2/4 = 50%
      expect(result[0].topic).toBe('Topic A');
      expect(result[0].accuracy).toBe(50);
      expect(result[0].totalQuestions).toBe(4);
    });

    it('correctly computes incorrectQuestionIds without duplicates', () => {
      const attempts = [
        makeAttempt('att-1', [{ questionId: 'a1', correct: false }]),
        makeAttempt('att-2', [{ questionId: 'a1', correct: false }]), // same question wrong again
      ];

      const result = identifyWeakestTopics(attempts, questions, 1);
      // a1 should appear only once in incorrectQuestionIds
      expect(result[0].incorrectQuestionIds).toEqual(['a1']);
    });
  });

  describe('getWeakTopicQuestionDetails', () => {
    it('returns full question objects for missed questions in a topic', () => {
      const attempts = [
        makeAttempt('att-1', [
          { questionId: 'a1', correct: false },
          { questionId: 'a2', correct: true },
          { questionId: 'a3', correct: false },
          { questionId: 'b1', correct: false }, // different topic
        ]),
      ];

      const result = getWeakTopicQuestionDetails('Topic A', attempts, questions);
      expect(result).toHaveLength(2);
      expect(result.map(q => q.id).sort()).toEqual(['a1', 'a3']);
      // Verify full question objects are returned
      expect(result[0].questionText).toBeDefined();
      expect(result[0].answerChoices).toBeDefined();
    });

    it('returns empty array when no questions missed in topic', () => {
      const attempts = [
        makeAttempt('att-1', [
          { questionId: 'a1', correct: true },
          { questionId: 'a2', correct: true },
        ]),
      ];

      const result = getWeakTopicQuestionDetails('Topic A', attempts, questions);
      expect(result).toHaveLength(0);
    });

    it('aggregates across multiple attempts', () => {
      const attempts = [
        makeAttempt('att-1', [{ questionId: 'a1', correct: false }]),
        makeAttempt('att-2', [{ questionId: 'a2', correct: false }]),
      ];

      const result = getWeakTopicQuestionDetails('Topic A', attempts, questions);
      expect(result).toHaveLength(2);
    });
  });

  describe('generateMiniQuiz', () => {
    it('returns questions from the specified topic', () => {
      const result = generateMiniQuiz('Topic A', questions, 3);
      expect(result.length).toBeLessThanOrEqual(3);
      result.forEach(q => {
        expect(q.topic).toBe('Topic A');
      });
    });

    it('respects the count parameter', () => {
      const result = generateMiniQuiz('Topic A', questions, 2);
      expect(result).toHaveLength(2);
    });

    it('returns all available if count exceeds topic questions', () => {
      const result = generateMiniQuiz('Topic D', questions, 10);
      expect(result).toHaveLength(2); // Topic D only has 2 questions
    });

    it('returns empty array for non-existent topic', () => {
      const result = generateMiniQuiz('Non-Existent Topic', questions, 5);
      expect(result).toHaveLength(0);
    });

    it('prioritizes incorrect questions when attempts are provided', () => {
      const attempts = [
        makeAttempt('att-1', [
          { questionId: 'a1', correct: false },
          { questionId: 'a2', correct: false },
          { questionId: 'a3', correct: true },
          { questionId: 'a4', correct: true },
        ]),
      ];

      // Run multiple times to account for shuffle; incorrect ones should always come first
      for (let i = 0; i < 10; i++) {
        const result = generateMiniQuiz('Topic A', questions, 2, attempts);
        expect(result).toHaveLength(2);
        // Both should be from incorrect pool (a1, a2) since we only want 2
        result.forEach(q => {
          expect(['a1', 'a2']).toContain(q.id);
        });
      }
    });

    it('fills with other topic questions after incorrect ones', () => {
      const attempts = [
        makeAttempt('att-1', [
          { questionId: 'a1', correct: false },
          { questionId: 'a2', correct: true },
          { questionId: 'a3', correct: true },
          { questionId: 'a4', correct: true },
        ]),
      ];

      // Request 3 questions; only 1 is incorrect, so 2 should be from correct pool
      const result = generateMiniQuiz('Topic A', questions, 3, attempts);
      expect(result).toHaveLength(3);
      // First should always be the incorrect one
      expect(result[0].id).toBe('a1');
    });

    it('works without attempt data (shuffle only)', () => {
      const result = generateMiniQuiz('Topic B', questions, 3);
      expect(result).toHaveLength(3);
      result.forEach(q => {
        expect(q.topic).toBe('Topic B');
      });
    });
  });
});
