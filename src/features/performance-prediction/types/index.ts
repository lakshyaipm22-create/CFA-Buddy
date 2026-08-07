/**
 * Performance Prediction types.
 * Defines the structures for pass probability prediction,
 * factor analysis, and study focus recommendations.
 */

export type TrendDirection = 'improving' | 'declining' | 'stable';

export interface PredictionResult {
  /** Overall pass probability (0-100) */
  passProb: number;
  /** Confidence interval: lower and upper bounds (0-100) */
  confidenceInterval: [number, number];
  /** Whether performance is improving, declining, or stable */
  trendDirection: TrendDirection;
  /** Estimated days until exam-ready (null if already ready) */
  projectedDaysToReady: number | null;
  /** Individual factor scores and their contributions */
  factors: PredictionFactor[];
  /** Timestamp of when this prediction was computed */
  computedAt: string;
}

export interface PredictionFactor {
  /** Display name of this factor */
  name: string;
  /** Raw score for this factor (0-100) */
  score: number;
  /** Weight as decimal (sums to 1.0 across all factors) */
  weight: number;
  /** Weighted contribution to overall score (score * weight) */
  weightedContribution: number;
  /** Human-readable description of the impact */
  impactDescription: string;
}

export interface FocusRecommendation {
  /** CFA subject name */
  subject: string;
  /** Specific topic within the subject (null if subject-level) */
  topic: string | null;
  /** Priority rank (1 = highest priority) */
  priority: number;
  /** Expected score improvement in percentage points per study hour */
  expectedImpact: number;
  /** Human-readable explanation of why this is recommended */
  reason: string;
  /** Current accuracy in this area (0-100) */
  currentAccuracy: number;
  /** CFA curriculum weight for the subject */
  curriculumWeight: number;
}

export interface TrendDataPoint {
  /** ISO date string */
  date: string;
  /** Accuracy on that date (0-100) */
  accuracy: number;
  /** Number of questions answered that day */
  questionCount: number;
}

export interface PredictionSnapshot {
  /** ISO date string for the day */
  date: string;
  /** Pass probability that day */
  passProb: number;
  /** Factor scores */
  factors: PredictionFactor[];
  /** Overall accuracy that day */
  accuracy: number;
}
