/**
 * Performance Prediction Engine.
 * Computes pass probability using a multi-factor weighted model:
 *   - Accuracy (40%): Weighted overall accuracy across subjects
 *   - Coverage (20%): Proportion of question bank attempted
 *   - Consistency/Trend (20%): Variance + trend direction in recent performance
 *   - Time Management (10%): Avg time per question relative to exam constraint
 *   - Confidence Calibration (10%): How well self-reported confidence matches outcomes
 */

import type { PracticeAttempt, AttemptQuestion } from '@/features/question-bank/types/attempt';
import { CFA_SUBJECTS_ORDERED, CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';
import type {
  PredictionResult,
  PredictionFactor,
  TrendDirection,
  TrendDataPoint,
} from '../types';

/** Factor weights (must sum to 1.0) */
const FACTOR_WEIGHTS = {
  accuracy: 0.4,
  coverage: 0.2,
  consistency: 0.2,
  timeManagement: 0.1,
  confidenceCalibration: 0.1,
} as const;

/** CFA Level I exam allows ~90 seconds per question on average */
const IDEAL_TIME_PER_QUESTION = 90;

/** Maximum time before penalty kicks in (3 minutes per question) */
const MAX_ACCEPTABLE_TIME = 180;

/**
 * Main entry: compute pass probability from practice attempts and question counts.
 */
export function computePassProbability(
  attempts: PracticeAttempt[],
  questionCountBySubject: Record<string, number>
): PredictionResult {
  if (attempts.length === 0) {
    return createEmptyResult();
  }

  const accuracyFactor = computeAccuracyFactor(attempts);
  const coverageFactor = computeCoverageFactor(attempts, questionCountBySubject);
  const consistencyFactor = computeConsistencyFactor(attempts);
  const timeFactor = computeTimeManagementFactor(attempts);
  const calibrationFactor = computeCalibrationFactor(attempts);

  const factors: PredictionFactor[] = [
    accuracyFactor,
    coverageFactor,
    consistencyFactor,
    timeFactor,
    calibrationFactor,
  ];

  // Weighted sum
  const rawScore = factors.reduce((sum, f) => sum + f.weightedContribution, 0);

  // Apply sigmoid-like transformation to produce a probability
  const passProb = Math.round(transformToPassProbability(rawScore));

  // Confidence interval based on data quantity
  const totalQuestions = attempts.reduce((sum, a) => sum + a.overallTotal, 0);
  const intervalWidth = computeConfidenceWidth(totalQuestions);
  const confidenceInterval: [number, number] = [
    Math.max(0, Math.round(passProb - intervalWidth)),
    Math.min(100, Math.round(passProb + intervalWidth)),
  ];

  // Trend direction from consistency analysis
  const trendDirection = computeTrendDirection(attempts);

  // Projected days to ready
  const projectedDaysToReady = estimateDaysToReady(passProb, trendDirection, attempts);

  return {
    passProb,
    confidenceInterval,
    trendDirection,
    projectedDaysToReady,
    factors,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Compute accuracy factor: curriculum-weighted accuracy across all subjects.
 */
function computeAccuracyFactor(attempts: PracticeAttempt[]): PredictionFactor {
  const subjectStats = new Map<string, { correct: number; total: number }>();

  for (const attempt of attempts) {
    const existing = subjectStats.get(attempt.subjectName) ?? { correct: 0, total: 0 };
    existing.correct += attempt.overallScore;
    existing.total += attempt.overallTotal;
    subjectStats.set(attempt.subjectName, existing);
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const subject of CFA_SUBJECTS_ORDERED) {
    const stats = subjectStats.get(subject);
    if (stats && stats.total > 0) {
      const accuracy = stats.correct / stats.total;
      const weight = CFA_CURRICULUM_WEIGHTS[subject] ?? 0;
      weightedSum += accuracy * weight;
      totalWeight += weight;
    }
  }

  const score = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  return {
    name: 'Accuracy',
    score: Math.round(score),
    weight: FACTOR_WEIGHTS.accuracy,
    weightedContribution: score * FACTOR_WEIGHTS.accuracy,
    impactDescription: score >= 70
      ? 'Strong accuracy across studied subjects'
      : score >= 50
        ? 'Moderate accuracy; focus on weak subjects'
        : 'Below passing threshold; intensive review needed',
  };
}

/**
 * Compute coverage factor: proportion of available questions attempted.
 */
function computeCoverageFactor(
  attempts: PracticeAttempt[],
  questionCountBySubject: Record<string, number>
): PredictionFactor {
  const attemptedIds = new Set<string>();

  for (const attempt of attempts) {
    for (const mr of attempt.moduleResults) {
      for (const qa of mr.questionAttempts) {
        attemptedIds.add(qa.questionId);
      }
    }
  }

  const totalAvailable = Object.values(questionCountBySubject).reduce((s, c) => s + c, 0);
  const coverageRatio = totalAvailable > 0 ? attemptedIds.size / totalAvailable : 0;

  // Score: coverage capped at 100, with diminishing returns after 60%
  const score = Math.min(100, coverageRatio * 100 * (coverageRatio > 0.6 ? 1.1 : 1.0));

  return {
    name: 'Coverage',
    score: Math.round(score),
    weight: FACTOR_WEIGHTS.coverage,
    weightedContribution: score * FACTOR_WEIGHTS.coverage,
    impactDescription: score >= 60
      ? 'Good breadth of practice material covered'
      : score >= 30
        ? 'Moderate coverage; practice more subjects'
        : 'Low coverage; many topics remain unvisited',
  };
}

/**
 * Compute consistency factor: combines low variance in scores + positive trend.
 */
function computeConsistencyFactor(attempts: PracticeAttempt[]): PredictionFactor {
  const sortedByDate = [...attempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  if (sortedByDate.length < 2) {
    // Not enough data to measure consistency
    return {
      name: 'Consistency & Trend',
      score: 50,
      weight: FACTOR_WEIGHTS.consistency,
      weightedContribution: 50 * FACTOR_WEIGHTS.consistency,
      impactDescription: 'Not enough sessions to measure consistency',
    };
  }

  // Variance component (lower variance = higher score)
  const percentages = sortedByDate.map(a => a.overallPercentage);
  const mean = percentages.reduce((s, p) => s + p, 0) / percentages.length;
  const variance = percentages.reduce((s, p) => s + (p - mean) ** 2, 0) / percentages.length;
  const stdDev = Math.sqrt(variance);

  // Normalize: stdDev of 0 = perfect consistency (100), stdDev of 30+ = poor (0)
  const varianceScore = Math.max(0, Math.min(100, 100 - (stdDev / 30) * 100));

  // Trend component: compare recent average to earlier average
  const midpoint = Math.floor(sortedByDate.length / 2);
  const earlyAvg =
    sortedByDate.slice(0, midpoint).reduce((s, a) => s + a.overallPercentage, 0) / midpoint;
  const lateAvg =
    sortedByDate.slice(midpoint).reduce((s, a) => s + a.overallPercentage, 0) /
    (sortedByDate.length - midpoint);

  // Trend bonus/penalty: +25 for strong improvement, -25 for decline
  const trendDiff = lateAvg - earlyAvg;
  const trendBonus = Math.max(-25, Math.min(25, trendDiff * 2.5));

  const score = Math.max(0, Math.min(100, varianceScore * 0.6 + (50 + trendBonus) * 0.4));

  let description: string;
  if (trendDiff > 5) {
    description = 'Improving trend with good consistency';
  } else if (trendDiff < -5) {
    description = 'Declining trend detected; review study habits';
  } else {
    description = 'Stable performance across sessions';
  }

  return {
    name: 'Consistency & Trend',
    score: Math.round(score),
    weight: FACTOR_WEIGHTS.consistency,
    weightedContribution: score * FACTOR_WEIGHTS.consistency,
    impactDescription: description,
  };
}

/**
 * Compute time management factor based on average time per question.
 */
function computeTimeManagementFactor(attempts: PracticeAttempt[]): PredictionFactor {
  const allTimes: number[] = [];

  for (const attempt of attempts) {
    for (const mr of attempt.moduleResults) {
      for (const qa of mr.questionAttempts) {
        allTimes.push(qa.timeSpentSeconds);
      }
    }
  }

  if (allTimes.length === 0) {
    return {
      name: 'Time Management',
      score: 50,
      weight: FACTOR_WEIGHTS.timeManagement,
      weightedContribution: 50 * FACTOR_WEIGHTS.timeManagement,
      impactDescription: 'No timing data available',
    };
  }

  const avgTime = allTimes.reduce((s, t) => s + t, 0) / allTimes.length;

  // Score: ideal is around 90s, penalty for being too slow or too fast
  let score: number;
  if (avgTime <= IDEAL_TIME_PER_QUESTION) {
    // Fast or at ideal: check if too fast (< 20s suggests rushing)
    score = avgTime < 20 ? 60 : 100;
  } else if (avgTime <= MAX_ACCEPTABLE_TIME) {
    // Between ideal and max: linear decay
    const ratio = (avgTime - IDEAL_TIME_PER_QUESTION) / (MAX_ACCEPTABLE_TIME - IDEAL_TIME_PER_QUESTION);
    score = 100 - ratio * 50;
  } else {
    // Over max: heavy penalty
    score = Math.max(20, 50 - ((avgTime - MAX_ACCEPTABLE_TIME) / 60) * 15);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'Time Management',
    score: Math.round(score),
    weight: FACTOR_WEIGHTS.timeManagement,
    weightedContribution: score * FACTOR_WEIGHTS.timeManagement,
    impactDescription: avgTime <= IDEAL_TIME_PER_QUESTION
      ? 'Answering within exam time constraints'
      : avgTime <= MAX_ACCEPTABLE_TIME
        ? 'Slightly slow; practice speed under timed conditions'
        : 'Significantly over time; exam pacing is a risk',
  };
}

/**
 * Compute confidence calibration factor.
 * Measures how well self-reported confidence matches actual outcomes.
 */
function computeCalibrationFactor(attempts: PracticeAttempt[]): PredictionFactor {
  let calibrated = 0;
  let total = 0;

  for (const attempt of attempts) {
    for (const mr of attempt.moduleResults) {
      for (const qa of mr.questionAttempts) {
        total++;
        // Well-calibrated: High confidence + correct, or Low confidence + incorrect
        if (
          (qa.confidence === 'High' && qa.correct) ||
          (qa.confidence === 'Low' && !qa.correct)
        ) {
          calibrated++;
        } else if (qa.confidence === 'Medium') {
          // Medium confidence is partially calibrated regardless
          calibrated += 0.5;
        }
      }
    }
  }

  const score = total > 0 ? (calibrated / total) * 100 : 50;

  return {
    name: 'Confidence Calibration',
    score: Math.round(score),
    weight: FACTOR_WEIGHTS.confidenceCalibration,
    weightedContribution: score * FACTOR_WEIGHTS.confidenceCalibration,
    impactDescription: score >= 70
      ? 'Good self-awareness of knowledge gaps'
      : score >= 50
        ? 'Moderate calibration; some blind spots exist'
        : 'Poor calibration; overconfidence or underconfidence detected',
  };
}

/**
 * Transform raw weighted score (0-100) to a pass probability.
 * Uses a piecewise linear curve that maps strong performers to high probabilities.
 */
function transformToPassProbability(rawScore: number): number {
  // Clamp to valid range
  const clamped = Math.max(0, Math.min(100, rawScore));

  // Piecewise linear with smoothing for interpretability:
  // Raw 0-30: probability 0-12%
  // Raw 30-50: probability 12-40%
  // Raw 50-65: probability 40-70%
  // Raw 65-80: probability 70-88%
  // Raw 80-100: probability 88-98%
  if (clamped <= 30) {
    return (clamped / 30) * 12;
  } else if (clamped <= 50) {
    return 12 + ((clamped - 30) / 20) * 28;
  } else if (clamped <= 65) {
    return 40 + ((clamped - 50) / 15) * 30;
  } else if (clamped <= 80) {
    return 70 + ((clamped - 65) / 15) * 18;
  } else {
    return 88 + ((clamped - 80) / 20) * 10;
  }
}

/**
 * Determine confidence interval width based on sample size.
 * More questions answered = narrower interval.
 */
function computeConfidenceWidth(totalQuestions: number): number {
  if (totalQuestions >= 500) return 3;
  if (totalQuestions >= 200) return 5;
  if (totalQuestions >= 100) return 8;
  if (totalQuestions >= 50) return 12;
  if (totalQuestions >= 20) return 18;
  return 25;
}

/**
 * Analyze trend direction based on recent sessions.
 */
export function computeTrendDirection(attempts: PracticeAttempt[]): TrendDirection {
  if (attempts.length < 3) return 'stable';

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  // Compare average of last 3 sessions to preceding 3 sessions
  const recentCount = Math.min(3, Math.floor(sorted.length / 2));
  const recent = sorted.slice(-recentCount);
  const earlier = sorted.slice(-(recentCount * 2), -recentCount);

  if (earlier.length === 0) return 'stable';

  const recentAvg = recent.reduce((s, a) => s + a.overallPercentage, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, a) => s + a.overallPercentage, 0) / earlier.length;

  const diff = recentAvg - earlierAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * Compute daily accuracy data points for trend visualization.
 */
export function computeTrendData(
  attempts: PracticeAttempt[],
  windowDays: 7 | 14 | 30
): TrendDataPoint[] {
  if (attempts.length === 0) return [];

  const now = new Date();
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // Filter attempts within window
  const windowAttempts = attempts.filter(
    a => new Date(a.completedAt).getTime() >= cutoff.getTime()
  );

  // Group by date
  const dateMap = new Map<string, { correct: number; total: number }>();

  for (const attempt of windowAttempts) {
    const date = attempt.completedAt.split('T')[0];
    const existing = dateMap.get(date) ?? { correct: 0, total: 0 };
    existing.correct += attempt.overallScore;
    existing.total += attempt.overallTotal;
    dateMap.set(date, existing);
  }

  // Convert to sorted data points
  const points: TrendDataPoint[] = Array.from(dateMap.entries())
    .map(([date, stats]) => ({
      date,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      questionCount: stats.total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return points;
}

/**
 * Compute consistency score: measures variance in daily scores.
 * Returns 0-100 where 100 = perfectly consistent.
 */
export function computeConsistency(attempts: PracticeAttempt[]): number {
  if (attempts.length < 2) return 50;

  const percentages = attempts.map(a => a.overallPercentage);
  const mean = percentages.reduce((s, p) => s + p, 0) / percentages.length;
  const variance = percentages.reduce((s, p) => s + (p - mean) ** 2, 0) / percentages.length;
  const stdDev = Math.sqrt(variance);

  // Normalize: 0 stdDev = 100, 30+ stdDev = 0
  return Math.max(0, Math.min(100, Math.round(100 - (stdDev / 30) * 100)));
}

/**
 * Estimate days until exam-ready (pass prob >= 70%).
 */
function estimateDaysToReady(
  currentProb: number,
  trend: TrendDirection,
  attempts: PracticeAttempt[]
): number | null {
  if (currentProb >= 70) return null; // Already ready

  // Estimate improvement rate from history
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  if (sorted.length < 2) return null; // Cannot estimate

  const firstDate = new Date(sorted[0].completedAt).getTime();
  const lastDate = new Date(sorted[sorted.length - 1].completedAt).getTime();
  const daySpan = Math.max(1, (lastDate - firstDate) / (24 * 60 * 60 * 1000));

  // Daily improvement rate based on trend
  let dailyImprovement: number;
  if (trend === 'improving') {
    dailyImprovement = 0.5; // ~0.5% per day when improving
  } else if (trend === 'stable') {
    dailyImprovement = 0.2; // Slower improvement when stable
  } else {
    return null; // Cannot project if declining
  }

  const gap = 70 - currentProb;
  const daysNeeded = Math.ceil(gap / dailyImprovement);

  return Math.min(365, daysNeeded); // Cap at 1 year
}

/**
 * Create an empty prediction result for zero-attempt state.
 */
function createEmptyResult(): PredictionResult {
  const emptyFactors: PredictionFactor[] = [
    {
      name: 'Accuracy',
      score: 0,
      weight: FACTOR_WEIGHTS.accuracy,
      weightedContribution: 0,
      impactDescription: 'No practice data yet',
    },
    {
      name: 'Coverage',
      score: 0,
      weight: FACTOR_WEIGHTS.coverage,
      weightedContribution: 0,
      impactDescription: 'No questions attempted',
    },
    {
      name: 'Consistency & Trend',
      score: 0,
      weight: FACTOR_WEIGHTS.consistency,
      weightedContribution: 0,
      impactDescription: 'No sessions to analyze',
    },
    {
      name: 'Time Management',
      score: 0,
      weight: FACTOR_WEIGHTS.timeManagement,
      weightedContribution: 0,
      impactDescription: 'No timing data',
    },
    {
      name: 'Confidence Calibration',
      score: 0,
      weight: FACTOR_WEIGHTS.confidenceCalibration,
      weightedContribution: 0,
      impactDescription: 'No confidence data',
    },
  ];

  return {
    passProb: 0,
    confidenceInterval: [0, 0],
    trendDirection: 'stable',
    projectedDaysToReady: null,
    factors: emptyFactors,
    computedAt: new Date().toISOString(),
  };
}
