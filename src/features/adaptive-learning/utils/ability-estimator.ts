/**
 * IRT/ELO Bayesian ability estimator.
 * Simplified Item Response Theory model using ELO-style updates.
 *
 * The model uses a 1-parameter logistic (Rasch) model where:
 * P(correct) = 1 / (1 + exp(-(theta - difficulty)))
 *
 * After each response, theta is updated using an ELO-style Bayesian update.
 */

import {
  DIFFICULTY_MAP,
  INITIAL_THETA,
  INITIAL_SE,
  K_FACTOR,
  MIN_SE,
  type AdaptiveResponse,
} from '../types';

/**
 * Convert a difficulty label to a numeric IRT difficulty parameter.
 */
export function difficultyToNumeric(difficulty: 'Easy' | 'Medium' | 'Hard'): number {
  return DIFFICULTY_MAP[difficulty];
}

/**
 * Compute the probability of a correct response given theta and item difficulty.
 * Uses the Rasch model: P = 1 / (1 + exp(-(theta - b)))
 */
export function probabilityCorrect(theta: number, difficulty: number): number {
  const exponent = -(theta - difficulty);
  // Clamp exponent to prevent overflow
  if (exponent > 10) return 0.0001;
  if (exponent < -10) return 0.9999;
  return 1 / (1 + Math.exp(exponent));
}

/**
 * Update ability estimate after a single response.
 * Uses ELO-style Bayesian update: theta += K * (observed - expected)
 *
 * @param currentTheta - Current ability estimate
 * @param questionDifficulty - Numeric difficulty of the question
 * @param correct - Whether the answer was correct
 * @returns New theta estimate
 */
export function updateAbility(
  currentTheta: number,
  questionDifficulty: number,
  correct: boolean
): number {
  const expected = probabilityCorrect(currentTheta, questionDifficulty);
  const observed = correct ? 1 : 0;
  const update = K_FACTOR * (observed - expected);
  return currentTheta + update;
}

/**
 * Update standard error after a response.
 * SE decreases as more information is gathered, but never below MIN_SE.
 * The information gained is proportional to p*(1-p) (Fisher information).
 */
export function updateStandardError(
  currentSE: number,
  theta: number,
  questionDifficulty: number
): number {
  const p = probabilityCorrect(theta, questionDifficulty);
  const information = p * (1 - p); // Fisher information for Rasch model
  // Reduce SE proportionally to information gained
  const newSE = currentSE * (1 - 0.1 * information);
  return Math.max(newSE, MIN_SE);
}

/**
 * Estimate ability from a full response history.
 * Uses iterative ELO updates starting from INITIAL_THETA.
 *
 * @param responses - Array of adaptive responses
 * @returns Final theta estimate
 */
export function estimateAbility(responses: AdaptiveResponse[]): number {
  let theta = INITIAL_THETA;
  for (const response of responses) {
    const difficulty = difficultyToNumeric(response.difficulty);
    theta = updateAbility(theta, difficulty, response.correct);
  }
  return theta;
}

/**
 * Estimate ability for a specific topic from response history.
 *
 * @param responses - Full response history
 * @param topic - Topic to filter by
 * @returns Theta for the given topic, or INITIAL_THETA if no data
 */
export function estimateTopicAbility(responses: AdaptiveResponse[], topic: string): number {
  const topicResponses = responses.filter(r => r.topic === topic);
  if (topicResponses.length === 0) return INITIAL_THETA;
  return estimateAbility(topicResponses);
}

/**
 * Compute the expected information gain from answering a question.
 * Information is maximized when P(correct) is near 0.5 (question matches ability).
 * Uses Fisher information: I = p * (1-p)
 *
 * @param theta - Current ability estimate
 * @param questionDifficulty - Numeric difficulty of the question
 * @returns Expected information gain (0 to 0.25, max at theta == difficulty)
 */
export function computeInformationGain(theta: number, questionDifficulty: number): number {
  const p = probabilityCorrect(theta, questionDifficulty);
  return p * (1 - p);
}

/**
 * Compute standard error from response history.
 * Starts at INITIAL_SE and decreases with each response.
 */
export function computeStandardError(responses: AdaptiveResponse[]): number {
  let se = INITIAL_SE;
  let theta = INITIAL_THETA;
  for (const response of responses) {
    const difficulty = difficultyToNumeric(response.difficulty);
    se = updateStandardError(se, theta, difficulty);
    theta = updateAbility(theta, difficulty, response.correct);
  }
  return se;
}
