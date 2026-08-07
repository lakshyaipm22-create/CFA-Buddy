/**
 * Persistence layer for adaptive learning state.
 * Stores AdaptiveState in localStorage under 'cfa-buddy-adaptive-state'.
 * Follows the same pattern as attempt-storage.ts.
 */

import type { AdaptiveState, AdaptiveResponse, TopicAbility } from '../types';
import { INITIAL_THETA, INITIAL_SE } from '../types';
import {
  estimateAbility,
  estimateTopicAbility,
  computeStandardError,
  difficultyToNumeric,
  updateAbility,
} from './ability-estimator';

const ADAPTIVE_STATE_KEY = 'cfa-buddy-adaptive-state';

/**
 * Create a fresh adaptive state for a new learner.
 */
export function createInitialState(): AdaptiveState {
  return {
    ability: {
      theta: INITIAL_THETA,
      standardError: INITIAL_SE,
      topicBreakdown: {},
    },
    responseHistory: [],
    questionsSeen: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Load adaptive state from localStorage.
 * Returns initial state if nothing is stored or if parsing fails.
 */
export function loadAdaptiveState(): AdaptiveState {
  if (typeof window === 'undefined') return createInitialState();

  try {
    const raw = localStorage.getItem(ADAPTIVE_STATE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as AdaptiveState;
    // Basic validation
    if (!parsed.ability || !Array.isArray(parsed.responseHistory)) {
      return createInitialState();
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}

/**
 * Save adaptive state to localStorage.
 */
export function saveAdaptiveState(state: AdaptiveState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADAPTIVE_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full; best-effort save
    console.warn('Failed to save adaptive state (localStorage may be full)');
  }
}

/**
 * Record a response and update the adaptive state.
 * Updates overall theta, topic theta, and adds to history.
 *
 * @param state - Current adaptive state
 * @param response - The new response to record
 * @returns Updated adaptive state
 */
export function recordResponse(
  state: AdaptiveState,
  response: AdaptiveResponse
): AdaptiveState {
  const newHistory = [...state.responseHistory, response];
  const newSeen = [...state.questionsSeen, response.questionId];

  // Recompute overall ability
  const overallTheta = estimateAbility(newHistory);
  const overallSE = computeStandardError(newHistory);

  // Update topic breakdown
  const topic = response.topic;
  const topicResponses = newHistory.filter(r => r.topic === topic);
  const topicTheta = estimateTopicAbility(newHistory, topic);
  const topicCorrect = topicResponses.filter(r => r.correct).length;

  const topicAbility: TopicAbility = {
    topic,
    subject: response.subject,
    theta: topicTheta,
    standardError: computeTopicSE(topicResponses),
    questionsAnswered: topicResponses.length,
    accuracy: topicResponses.length > 0 ? topicCorrect / topicResponses.length : 0,
    lastUpdated: new Date().toISOString(),
  };

  const newBreakdown = {
    ...state.ability.topicBreakdown,
    [topic]: topicAbility,
  };

  const newState: AdaptiveState = {
    ability: {
      theta: overallTheta,
      standardError: overallSE,
      topicBreakdown: newBreakdown,
    },
    responseHistory: newHistory,
    questionsSeen: newSeen,
    lastUpdated: new Date().toISOString(),
  };

  saveAdaptiveState(newState);
  return newState;
}

/**
 * Compute standard error for a topic's response history.
 */
function computeTopicSE(responses: AdaptiveResponse[]): number {
  if (responses.length === 0) return INITIAL_SE;

  let se = INITIAL_SE;
  let theta = INITIAL_THETA;
  for (const r of responses) {
    const difficulty = difficultyToNumeric(r.difficulty);
    const p = 1 / (1 + Math.exp(-(theta - difficulty)));
    const info = p * (1 - p);
    se = Math.max(se * (1 - 0.1 * info), 0.3);
    theta = updateAbility(theta, difficulty, r.correct);
  }
  return se;
}

/**
 * Reset adaptive state (clear all history).
 */
export function resetAdaptiveState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADAPTIVE_STATE_KEY);
}
