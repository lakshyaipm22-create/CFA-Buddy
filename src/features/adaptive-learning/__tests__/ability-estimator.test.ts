import { describe, it, expect } from 'vitest';
import {
  updateAbility,
  estimateAbility,
  estimateTopicAbility,
  computeInformationGain,
  probabilityCorrect,
  difficultyToNumeric,
  computeStandardError,
  updateStandardError,
} from '../utils/ability-estimator';
import { INITIAL_THETA, INITIAL_SE, DIFFICULTY_MAP } from '../types';
import type { AdaptiveResponse } from '../types';

function makeResponse(
  correct: boolean,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  topic: string = 'Test Topic'
): AdaptiveResponse {
  return {
    questionId: `q-${Math.random().toString(36).slice(2)}`,
    topic,
    subject: 'Test Subject',
    difficulty,
    correct,
    thetaBefore: 0,
    thetaAfter: 0,
    timestamp: new Date().toISOString(),
  };
}

describe('ability-estimator', () => {
  describe('probabilityCorrect', () => {
    it('returns 0.5 when theta equals difficulty', () => {
      const p = probabilityCorrect(0, 0);
      expect(p).toBeCloseTo(0.5, 5);
    });

    it('returns > 0.5 when theta > difficulty', () => {
      const p = probabilityCorrect(1.0, 0);
      expect(p).toBeGreaterThan(0.5);
    });

    it('returns < 0.5 when theta < difficulty', () => {
      const p = probabilityCorrect(-1.0, 0);
      expect(p).toBeLessThan(0.5);
    });

    it('is bounded between 0 and 1', () => {
      expect(probabilityCorrect(10, -10)).toBeLessThanOrEqual(1);
      expect(probabilityCorrect(10, -10)).toBeGreaterThan(0);
      expect(probabilityCorrect(-10, 10)).toBeGreaterThanOrEqual(0);
      expect(probabilityCorrect(-10, 10)).toBeLessThan(1);
    });

    it('handles extreme positive difference without overflow', () => {
      const p = probabilityCorrect(100, -100);
      expect(p).toBeCloseTo(0.9999, 3);
      expect(Number.isFinite(p)).toBe(true);
    });

    it('handles extreme negative difference without overflow', () => {
      const p = probabilityCorrect(-100, 100);
      expect(p).toBeCloseTo(0.0001, 3);
      expect(Number.isFinite(p)).toBe(true);
    });
  });

  describe('difficultyToNumeric', () => {
    it('maps Easy to -1.0', () => {
      expect(difficultyToNumeric('Easy')).toBe(-1.0);
    });

    it('maps Medium to 0.0', () => {
      expect(difficultyToNumeric('Medium')).toBe(0.0);
    });

    it('maps Hard to 1.5', () => {
      expect(difficultyToNumeric('Hard')).toBe(1.5);
    });
  });

  describe('updateAbility', () => {
    it('correct answers increase theta', () => {
      const newTheta = updateAbility(INITIAL_THETA, 0, true);
      expect(newTheta).toBeGreaterThan(INITIAL_THETA);
    });

    it('wrong answers decrease theta', () => {
      const newTheta = updateAbility(INITIAL_THETA, 0, false);
      expect(newTheta).toBeLessThan(INITIAL_THETA);
    });

    it('harder questions give more theta gain on correct answer', () => {
      const gainEasy = updateAbility(INITIAL_THETA, DIFFICULTY_MAP.Easy, true) - INITIAL_THETA;
      const gainHard = updateAbility(INITIAL_THETA, DIFFICULTY_MAP.Hard, true) - INITIAL_THETA;
      expect(gainHard).toBeGreaterThan(gainEasy);
    });

    it('easier questions give more theta loss on incorrect answer', () => {
      const lossEasy = INITIAL_THETA - updateAbility(INITIAL_THETA, DIFFICULTY_MAP.Easy, false);
      const lossHard = INITIAL_THETA - updateAbility(INITIAL_THETA, DIFFICULTY_MAP.Hard, false);
      expect(lossEasy).toBeGreaterThan(lossHard);
    });

    it('update is symmetric around theta==difficulty at p=0.5', () => {
      const gainCorrect = updateAbility(0, 0, true) - 0;
      const lossIncorrect = 0 - updateAbility(0, 0, false);
      expect(gainCorrect).toBeCloseTo(lossIncorrect, 5);
    });

    it('returns finite values for all inputs', () => {
      expect(Number.isFinite(updateAbility(5, -5, true))).toBe(true);
      expect(Number.isFinite(updateAbility(-5, 5, false))).toBe(true);
    });
  });

  describe('estimateAbility', () => {
    it('returns INITIAL_THETA for empty response array', () => {
      expect(estimateAbility([])).toBe(INITIAL_THETA);
    });

    it('increases with correct answers', () => {
      const responses = Array.from({ length: 5 }, () => makeResponse(true, 'Medium'));
      const theta = estimateAbility(responses);
      expect(theta).toBeGreaterThan(INITIAL_THETA);
    });

    it('decreases with wrong answers', () => {
      const responses = Array.from({ length: 5 }, () => makeResponse(false, 'Medium'));
      const theta = estimateAbility(responses);
      expect(theta).toBeLessThan(INITIAL_THETA);
    });

    it('converges after many attempts on same difficulty', () => {
      // After many correct Easy questions, theta should stabilize
      const responses = Array.from({ length: 50 }, () => makeResponse(true, 'Easy'));
      const theta30 = estimateAbility(responses.slice(0, 30));
      const theta50 = estimateAbility(responses);
      // The difference between 30 and 50 should be less than between 0 and 30
      const diff30 = theta30 - INITIAL_THETA;
      const diff50to30 = theta50 - theta30;
      expect(Math.abs(diff50to30)).toBeLessThan(Math.abs(diff30));
    });

    it('mixed performance produces intermediate theta', () => {
      const responses = [
        makeResponse(true, 'Easy'),
        makeResponse(false, 'Medium'),
        makeResponse(true, 'Easy'),
        makeResponse(false, 'Hard'),
        makeResponse(true, 'Medium'),
      ];
      const theta = estimateAbility(responses);
      // Should be somewhere near 0 with mixed performance
      expect(theta).toBeGreaterThan(-1.5);
      expect(theta).toBeLessThan(1.5);
    });
  });

  describe('estimateTopicAbility', () => {
    it('returns INITIAL_THETA when no responses for that topic', () => {
      const responses = [makeResponse(true, 'Easy', 'Other Topic')];
      const theta = estimateTopicAbility(responses, 'Target Topic');
      expect(theta).toBe(INITIAL_THETA);
    });

    it('only considers responses for the specified topic', () => {
      const responses = [
        makeResponse(true, 'Easy', 'Topic A'),
        makeResponse(true, 'Easy', 'Topic A'),
        makeResponse(false, 'Easy', 'Topic B'),
        makeResponse(false, 'Easy', 'Topic B'),
      ];
      const thetaA = estimateTopicAbility(responses, 'Topic A');
      const thetaB = estimateTopicAbility(responses, 'Topic B');
      expect(thetaA).toBeGreaterThan(INITIAL_THETA);
      expect(thetaB).toBeLessThan(INITIAL_THETA);
    });
  });

  describe('computeInformationGain', () => {
    it('is maximized when question difficulty matches theta', () => {
      const infoAtMatch = computeInformationGain(0, 0);
      const infoAbove = computeInformationGain(0, 2);
      const infoBelow = computeInformationGain(0, -2);
      expect(infoAtMatch).toBeGreaterThan(infoAbove);
      expect(infoAtMatch).toBeGreaterThan(infoBelow);
    });

    it('maximum information gain is 0.25', () => {
      const maxInfo = computeInformationGain(0, 0);
      expect(maxInfo).toBeCloseTo(0.25, 5);
    });

    it('information gain approaches 0 for very mismatched questions', () => {
      const info = computeInformationGain(0, 10);
      expect(info).toBeLessThan(0.01);
    });

    it('is symmetric around the match point', () => {
      const infoAbove = computeInformationGain(0, 1);
      const infoBelow = computeInformationGain(0, -1);
      expect(infoAbove).toBeCloseTo(infoBelow, 5);
    });

    it('returns values between 0 and 0.25', () => {
      const testCases = [
        [0, 0], [1, -1], [-2, 3], [5, 5], [-3, -3],
      ];
      for (const [theta, diff] of testCases) {
        const info = computeInformationGain(theta, diff);
        expect(info).toBeGreaterThanOrEqual(0);
        expect(info).toBeLessThanOrEqual(0.25);
      }
    });
  });

  describe('computeStandardError', () => {
    it('returns INITIAL_SE for empty responses', () => {
      expect(computeStandardError([])).toBe(INITIAL_SE);
    });

    it('decreases with more responses', () => {
      const responses = Array.from({ length: 10 }, () => makeResponse(true, 'Medium'));
      const se = computeStandardError(responses);
      expect(se).toBeLessThan(INITIAL_SE);
    });

    it('never goes below MIN_SE', () => {
      const responses = Array.from({ length: 100 }, () => makeResponse(true, 'Medium'));
      const se = computeStandardError(responses);
      expect(se).toBeGreaterThanOrEqual(0.3);
    });

    it('decreases faster with well-matched questions', () => {
      // Questions at theta=0 (matching initial theta) provide max info
      const matchedResponses = Array.from({ length: 5 }, () => makeResponse(true, 'Medium'));
      const seMatched = computeStandardError(matchedResponses);

      // Questions far from theta provide less info
      const mismatchedResponses = Array.from({ length: 5 }, () => makeResponse(true, 'Hard'));
      const seMismatched = computeStandardError(mismatchedResponses);

      // Matched questions should reduce SE faster (SE should be lower)
      expect(seMatched).toBeLessThan(seMismatched);
    });
  });

  describe('updateStandardError', () => {
    it('reduces SE when question matches theta', () => {
      const newSE = updateStandardError(1.0, 0, 0);
      expect(newSE).toBeLessThan(1.0);
    });

    it('reduces SE less when question is far from theta', () => {
      const seMatch = updateStandardError(1.0, 0, 0);
      const seFar = updateStandardError(1.0, 0, 5);
      // Both should reduce, but matching should reduce more
      expect(seMatch).toBeLessThan(seFar);
    });
  });
});
