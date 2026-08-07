/**
 * Topic mastery utilities.
 * Computes per-topic ability levels from the adaptive state.
 */

import type { TopicAbility, AdaptiveState } from '../types';
import { INITIAL_THETA } from '../types';
import { loadAdaptiveState } from './adaptive-storage';

export interface TopicMasteryEntry {
  theta: number;
  questionsAnswered: number;
  accuracy: number;
}

/**
 * Get the mastery map for all topics that have been practiced.
 * Returns a Record mapping topic name to mastery metrics.
 */
export function getTopicMasteryMap(): Record<string, TopicMasteryEntry> {
  const state = loadAdaptiveState();
  return computeTopicMasteryFromState(state);
}

/**
 * Compute topic mastery map from an adaptive state (pure function for testability).
 */
export function computeTopicMasteryFromState(
  state: AdaptiveState
): Record<string, TopicMasteryEntry> {
  const result: Record<string, TopicMasteryEntry> = {};

  for (const [topic, ability] of Object.entries(state.ability.topicBreakdown)) {
    result[topic] = {
      theta: ability.theta,
      questionsAnswered: ability.questionsAnswered,
      accuracy: ability.accuracy,
    };
  }

  return result;
}

/**
 * Get a mastery level label based on theta value.
 */
export function getMasteryLevel(theta: number): 'Beginner' | 'Developing' | 'Proficient' | 'Advanced' | 'Expert' {
  if (theta < -0.5) return 'Beginner';
  if (theta < 0.5) return 'Developing';
  if (theta < 1.0) return 'Proficient';
  if (theta < 1.5) return 'Advanced';
  return 'Expert';
}

/**
 * Get a color representing mastery level (using theme colors).
 */
export function getMasteryColor(theta: number): string {
  if (theta < -0.5) return '#ef4444'; // Red - Beginner
  if (theta < 0.0) return '#f97316'; // Orange - Low Developing
  if (theta < 0.5) return '#C5A258'; // Gold - Developing
  if (theta < 1.0) return '#22c55e'; // Light Green - Proficient
  return '#00843D'; // CFA Green - Advanced/Expert
}

/**
 * Get a sorted list of topics by mastery level (weakest first).
 */
export function getTopicsByWeakness(state: AdaptiveState): TopicAbility[] {
  const topics = Object.values(state.ability.topicBreakdown);
  return topics.sort((a, b) => a.theta - b.theta);
}

/**
 * Get topics that need attention (theta below a threshold and at least some attempts).
 */
export function getTopicsNeedingAttention(
  state: AdaptiveState,
  thetaThreshold: number = INITIAL_THETA
): TopicAbility[] {
  const topics = Object.values(state.ability.topicBreakdown);
  return topics
    .filter(t => t.theta < thetaThreshold && t.questionsAnswered >= 3)
    .sort((a, b) => a.theta - b.theta);
}
