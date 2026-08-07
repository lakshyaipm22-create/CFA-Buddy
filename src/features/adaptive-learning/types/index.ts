/**
 * Adaptive Learning Engine types.
 * Implements IRT-based ability estimation and adaptive question selection.
 */

/** Per-topic ability breakdown */
export interface TopicAbility {
  topic: string;
  subject: string;
  theta: number;
  standardError: number;
  questionsAnswered: number;
  accuracy: number;
  lastUpdated: string;
}

/** Overall ability estimate for a learner */
export interface AbilityEstimate {
  /** Overall theta (ability) score, typically -3 to +3 */
  theta: number;
  /** Standard error of the estimate (decreases with more data) */
  standardError: number;
  /** Per-topic breakdown */
  topicBreakdown: Record<string, TopicAbility>;
}

/** A single adaptive response record */
export interface AdaptiveResponse {
  questionId: string;
  topic: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  correct: boolean;
  thetaBefore: number;
  thetaAfter: number;
  timestamp: string;
}

/** Full adaptive state persisted in localStorage */
export interface AdaptiveState {
  /** Current overall ability estimate */
  ability: AbilityEstimate;
  /** Full response history for the adaptive engine */
  responseHistory: AdaptiveResponse[];
  /** Set of question IDs already seen in this adaptive learning context */
  questionsSeen: string[];
  /** When the state was last updated */
  lastUpdated: string;
}

/** Recommendation from the adaptive selector */
export interface AdaptiveRecommendation {
  questionId: string;
  reason: string;
  expectedInformationGain: number;
  targetTopic: string;
  targetDifficulty: 'Easy' | 'Medium' | 'Hard';
}

/** Difficulty-to-numeric mapping for IRT calculations */
export const DIFFICULTY_MAP: Record<string, number> = {
  Easy: -1.0,
  Medium: 0.0,
  Hard: 1.5,
};

/** Default initial theta for a new learner */
export const INITIAL_THETA = 0.0;

/** Default initial standard error */
export const INITIAL_SE = 1.5;

/** K-factor for ELO-style updates (controls update speed) */
export const K_FACTOR = 0.4;

/** Minimum standard error (prevents over-confidence) */
export const MIN_SE = 0.3;
