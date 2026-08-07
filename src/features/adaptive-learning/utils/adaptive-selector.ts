/**
 * Adaptive question selector.
 * Selects the next best question based on maximum information gain,
 * topic coverage balance, and avoidance of recently-seen questions.
 */

import type { Question } from '@/features/question-bank/types';
import type { AdaptiveState, AdaptiveRecommendation } from '../types';
import { difficultyToNumeric, computeInformationGain, estimateTopicAbility } from './ability-estimator';

/** Weight for information gain in scoring */
const INFO_GAIN_WEIGHT = 0.7;
/** Weight for topic coverage balance in scoring */
const COVERAGE_WEIGHT = 0.3;
/** Maximum number of recently-seen questions to avoid */
const RECENT_WINDOW = 50;

interface ScoredQuestion {
  question: Question;
  score: number;
  informationGain: number;
  reason: string;
}

/**
 * Get the topic's current ability from the adaptive state.
 */
function getTopicTheta(state: AdaptiveState, topic: string): number {
  const topicAbility = state.ability.topicBreakdown[topic];
  if (topicAbility) return topicAbility.theta;
  return estimateTopicAbility(state.responseHistory, topic);
}

/**
 * Compute coverage score for a topic.
 * Topics with fewer questions answered get higher scores to balance coverage.
 */
function computeCoverageScore(state: AdaptiveState, topic: string, allTopics: string[]): number {
  if (allTopics.length === 0) return 0;

  const topicCounts: Record<string, number> = {};
  for (const t of allTopics) {
    topicCounts[t] = 0;
  }
  for (const response of state.responseHistory) {
    if (response.topic in topicCounts) {
      topicCounts[response.topic]++;
    }
  }

  const maxCount = Math.max(1, ...Object.values(topicCounts));
  const topicCount = topicCounts[topic] ?? 0;

  // Lower count = higher coverage score (needs more attention)
  return 1 - topicCount / maxCount;
}

/**
 * Select the next best question from the pool for adaptive practice.
 *
 * Selection criteria (weighted):
 * 1. Information gain (70%) - questions near the ability frontier
 * 2. Topic coverage (30%) - under-practiced topics get a boost
 *
 * Additionally filters out recently-seen questions.
 *
 * @param pool - Available question pool
 * @param state - Current adaptive state
 * @returns Recommendation with the best question, or null if pool is empty
 */
export function selectAdaptiveQuestion(
  pool: Question[],
  state: AdaptiveState
): AdaptiveRecommendation | null {
  if (pool.length === 0) return null;

  // Filter out recently-seen questions
  const recentlySeen = new Set(
    state.questionsSeen.slice(-RECENT_WINDOW)
  );
  let candidates = pool.filter(q => !recentlySeen.has(q.id));

  // If all questions have been seen, allow repeats but still prefer unseen
  if (candidates.length === 0) {
    candidates = pool;
  }

  // Get all unique topics from candidates
  const allTopics = [...new Set(candidates.map(q => q.topic ?? q.subject))];

  // Score each candidate
  const scored: ScoredQuestion[] = candidates.map(question => {
    const topic = question.topic ?? question.subject;
    const topicTheta = getTopicTheta(state, topic);
    const questionDifficulty = difficultyToNumeric(question.difficulty);
    const informationGain = computeInformationGain(topicTheta, questionDifficulty);
    const coverageScore = computeCoverageScore(state, topic, allTopics);

    const score =
      INFO_GAIN_WEIGHT * (informationGain / 0.25) + // Normalize info gain to [0,1]
      COVERAGE_WEIGHT * coverageScore;

    const reason = informationGain > 0.2
      ? `Optimal difficulty for ${topic} (high information gain)`
      : coverageScore > 0.7
        ? `Under-practiced topic: ${topic}`
        : `Balanced practice for ${topic}`;

    return { question, score, informationGain, reason };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  return {
    questionId: best.question.id,
    reason: best.reason,
    expectedInformationGain: best.informationGain,
    targetTopic: best.question.topic ?? best.question.subject,
    targetDifficulty: best.question.difficulty,
  };
}

/**
 * Select multiple questions for an adaptive session.
 * Returns a sequence that progressively explores the ability frontier.
 *
 * @param pool - Available question pool
 * @param state - Current adaptive state
 * @param count - Number of questions to select
 * @returns Array of recommendations
 */
export function selectAdaptiveQuestions(
  pool: Question[],
  state: AdaptiveState,
  count: number
): AdaptiveRecommendation[] {
  const recommendations: AdaptiveRecommendation[] = [];
  const tempSeen = new Set(state.questionsSeen);

  for (let i = 0; i < count; i++) {
    const tempState: AdaptiveState = {
      ...state,
      questionsSeen: [...tempSeen],
    };

    const rec = selectAdaptiveQuestion(pool, tempState);
    if (!rec) break;

    recommendations.push(rec);
    tempSeen.add(rec.questionId);
  }

  return recommendations;
}
