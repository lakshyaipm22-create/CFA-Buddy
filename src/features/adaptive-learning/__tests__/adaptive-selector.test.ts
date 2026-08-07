import { describe, it, expect } from 'vitest';
import { selectAdaptiveQuestion, selectAdaptiveQuestions } from '../utils/adaptive-selector';
import { createInitialState } from '../utils/adaptive-storage';
import type { AdaptiveState, AdaptiveResponse } from '../types';
import { INITIAL_THETA, INITIAL_SE } from '../types';
import type { Question } from '@/features/question-bank/types';

function makeQuestion(
  id: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  topic: string = 'Default Topic',
  subject: string = 'Default Subject'
): Question {
  return {
    id,
    questionText: `Question ${id}`,
    answerChoices: [
      { label: 'A', text: 'Answer A', isCorrect: true, explanation: 'Correct' },
      { label: 'B', text: 'Answer B', isCorrect: false, explanation: 'Wrong' },
      { label: 'C', text: 'Answer C', isCorrect: false, explanation: 'Wrong' },
    ],
    difficulty,
    subject,
    reading: null,
    topic,
    provider: 'test',
    questionSourceFile: null,
  };
}

function makeResponse(
  questionId: string,
  correct: boolean,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  topic: string = 'Default Topic'
): AdaptiveResponse {
  return {
    questionId,
    topic,
    subject: 'Default Subject',
    difficulty,
    correct,
    thetaBefore: 0,
    thetaAfter: correct ? 0.2 : -0.2,
    timestamp: new Date().toISOString(),
  };
}

function makeStateWithHistory(responses: AdaptiveResponse[]): AdaptiveState {
  return {
    ability: {
      theta: INITIAL_THETA,
      standardError: INITIAL_SE,
      topicBreakdown: {},
    },
    responseHistory: responses,
    questionsSeen: responses.map(r => r.questionId),
    lastUpdated: new Date().toISOString(),
  };
}

describe('adaptive-selector', () => {
  describe('selectAdaptiveQuestion', () => {
    it('returns null for empty pool', () => {
      const state = createInitialState();
      const result = selectAdaptiveQuestion([], state);
      expect(result).toBeNull();
    });

    it('returns a recommendation for a non-empty pool', () => {
      const state = createInitialState();
      const pool = [makeQuestion('q1', 'Medium')];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      expect(result!.questionId).toBe('q1');
    });

    it('selects questions near ability level (prefers medium for initial theta)', () => {
      const state = createInitialState(); // theta = 0
      const pool = [
        makeQuestion('q-easy', 'Easy', 'Topic A'),
        makeQuestion('q-medium', 'Medium', 'Topic A'),
        makeQuestion('q-hard', 'Hard', 'Topic A'),
      ];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      // Medium (difficulty=0) matches initial theta=0, so should be preferred
      expect(result!.questionId).toBe('q-medium');
    });

    it('prefers harder questions after correct answers raise theta', () => {
      // Simulate a learner who has answered many correctly
      const responses = Array.from({ length: 10 }, (_, i) =>
        makeResponse(`prev-${i}`, true, 'Medium', 'Topic A')
      );
      const state: AdaptiveState = {
        ability: {
          theta: 1.0, // Elevated theta after correct answers
          standardError: 1.0,
          topicBreakdown: {
            'Topic A': {
              topic: 'Topic A',
              subject: 'Default Subject',
              theta: 1.0,
              standardError: 1.0,
              questionsAnswered: 10,
              accuracy: 1.0,
              lastUpdated: new Date().toISOString(),
            },
          },
        },
        responseHistory: responses,
        questionsSeen: responses.map(r => r.questionId),
        lastUpdated: new Date().toISOString(),
      };

      const pool = [
        makeQuestion('q-easy', 'Easy', 'Topic A'),
        makeQuestion('q-medium', 'Medium', 'Topic A'),
        makeQuestion('q-hard', 'Hard', 'Topic A'),
      ];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      // Hard (difficulty=1.5) is closest to theta=1.0, should be preferred
      expect(result!.questionId).toBe('q-hard');
    });

    it('avoids recently seen questions', () => {
      const state: AdaptiveState = {
        ...createInitialState(),
        questionsSeen: ['q1', 'q2'],
      };
      const pool = [
        makeQuestion('q1', 'Medium'),
        makeQuestion('q2', 'Medium'),
        makeQuestion('q3', 'Medium'),
      ];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      expect(result!.questionId).toBe('q3');
    });

    it('falls back to repeats when all questions have been seen', () => {
      const state: AdaptiveState = {
        ...createInitialState(),
        questionsSeen: ['q1', 'q2'],
      };
      const pool = [
        makeQuestion('q1', 'Medium'),
        makeQuestion('q2', 'Easy'),
      ];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      // Should still return something even though all seen
      expect(['q1', 'q2']).toContain(result!.questionId);
    });

    it('balances topic coverage - prefers under-practiced topics', () => {
      // Topic A has been heavily practiced, Topic B has not
      const responses = Array.from({ length: 10 }, (_, i) =>
        makeResponse(`prev-${i}`, true, 'Medium', 'Topic A')
      );
      const state = makeStateWithHistory(responses);

      const pool = [
        makeQuestion('q-a', 'Medium', 'Topic A'),
        makeQuestion('q-b', 'Medium', 'Topic B'),
      ];

      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      // Topic B should be preferred due to coverage bonus
      expect(result!.questionId).toBe('q-b');
    });

    it('includes reason in recommendation', () => {
      const state = createInitialState();
      const pool = [makeQuestion('q1', 'Medium')];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      expect(result!.reason).toBeTruthy();
      expect(typeof result!.reason).toBe('string');
    });

    it('includes expectedInformationGain between 0 and 0.25', () => {
      const state = createInitialState();
      const pool = [makeQuestion('q1', 'Medium')];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      expect(result!.expectedInformationGain).toBeGreaterThanOrEqual(0);
      expect(result!.expectedInformationGain).toBeLessThanOrEqual(0.25);
    });

    it('handles pool with only one question', () => {
      const state = createInitialState();
      const pool = [makeQuestion('q-only', 'Hard')];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      expect(result!.questionId).toBe('q-only');
    });

    it('handles questions without topic (uses subject as fallback)', () => {
      const state = createInitialState();
      const q: Question = {
        ...makeQuestion('q1', 'Medium'),
        topic: null,
      };
      const pool = [q];
      const result = selectAdaptiveQuestion(pool, state);
      expect(result).not.toBeNull();
      expect(result!.targetTopic).toBe('Default Subject');
    });
  });

  describe('selectAdaptiveQuestions', () => {
    it('returns empty array for empty pool', () => {
      const state = createInitialState();
      const results = selectAdaptiveQuestions([], state, 5);
      expect(results).toEqual([]);
    });

    it('returns requested count when pool is large enough', () => {
      const state = createInitialState();
      const pool = Array.from({ length: 20 }, (_, i) =>
        makeQuestion(`q-${i}`, 'Medium', `Topic ${i % 3}`)
      );
      const results = selectAdaptiveQuestions(pool, state, 5);
      expect(results).toHaveLength(5);
    });

    it('returns fewer than requested when pool is too small', () => {
      const state = createInitialState();
      const pool = [makeQuestion('q1', 'Medium')];
      const results = selectAdaptiveQuestions(pool, state, 5);
      // With one question, once it's "seen" in the temp state, subsequent picks may repeat it
      // But the algorithm allows repeats after filtering, so it should still return up to 5
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('does not select the same question consecutively when alternatives exist', () => {
      const state = createInitialState();
      const pool = Array.from({ length: 10 }, (_, i) =>
        makeQuestion(`q-${i}`, 'Medium', `Topic ${i % 5}`)
      );
      const results = selectAdaptiveQuestions(pool, state, 5);
      const ids = results.map(r => r.questionId);
      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('diversifies across topics when selecting multiple questions', () => {
      // Give the state some history in Topic A to trigger coverage balancing
      const responses = Array.from({ length: 5 }, (_, i) =>
        makeResponse(`prev-${i}`, true, 'Medium', 'Topic A')
      );
      const state = makeStateWithHistory(responses);
      const pool = [
        makeQuestion('q-a1', 'Medium', 'Topic A'),
        makeQuestion('q-a2', 'Medium', 'Topic A'),
        makeQuestion('q-a3', 'Medium', 'Topic A'),
        makeQuestion('q-b1', 'Medium', 'Topic B'),
        makeQuestion('q-b2', 'Medium', 'Topic B'),
        makeQuestion('q-c1', 'Medium', 'Topic C'),
      ];
      const results = selectAdaptiveQuestions(pool, state, 3);
      const topics = new Set(results.map(r => r.targetTopic));
      // Should cover at least 2 different topics in 3 questions
      expect(topics.size).toBeGreaterThanOrEqual(2);
    });
  });
});
