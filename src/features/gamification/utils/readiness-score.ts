import type { ReadinessResult } from '../types';

/**
 * CFA Level 1 curriculum weights (official approximate weights).
 */
const CFA_CURRICULUM_WEIGHTS: Record<string, number> = {
  'Ethical and Professional Standards': 0.15,
  'Quantitative Methods': 0.08,
  'Economics': 0.08,
  'Financial Statement Analysis': 0.13,
  'Corporate Issuers': 0.08,
  'Equity Investments': 0.13,
  'Fixed Income': 0.13,
  'Derivatives': 0.06,
  'Alternative Investments': 0.06,
  'Portfolio Management': 0.10,
};

const TOTAL_SUBJECTS = Object.keys(CFA_CURRICULUM_WEIGHTS).length;

interface SubjectStats {
  correct: number;
  total: number;
  lastStudied: string; // ISO date string
}

interface ReadinessInput {
  subjectStats: Record<string, SubjectStats>;
  streakDays: number;
  certainCorrect: number;
  certainTotal: number;
  totalQuestions: number;
}

/**
 * Calculate multi-factor exam readiness score.
 *
 * Factor 1 (40%): Weighted accuracy by CFA curriculum weights
 * Factor 2 (20%): Coverage - % of subjects with >= 5 questions attempted
 * Factor 3 (15%): Consistency - streak / 30 (capped at 1.0)
 * Factor 4 (15%): Confidence calibration - % of "Certain" answers correct
 * Factor 5 (10%): Recency - inverse of average days since each subject last studied
 */
export function calculateReadinessScore(input: ReadinessInput): ReadinessResult {
  const { subjectStats, streakDays, certainCorrect, certainTotal, totalQuestions } = input;

  // Factor 1: Weighted accuracy (40%)
  let weightedAccuracy = 0;
  if (totalQuestions > 0) {
    let totalWeight = 0;
    for (const [subject, weight] of Object.entries(CFA_CURRICULUM_WEIGHTS)) {
      const stats = subjectStats[subject];
      if (stats && stats.total > 0) {
        const subjectAccuracy = stats.correct / stats.total;
        weightedAccuracy += subjectAccuracy * weight;
        totalWeight += weight;
      }
    }
    // Normalize by total weight used (in case not all subjects attempted)
    if (totalWeight > 0) {
      weightedAccuracy = (weightedAccuracy / totalWeight) * 100;
    }
  }
  const accuracyScore = Math.min(Math.round(weightedAccuracy), 100);

  // Factor 2: Coverage (20%)
  const subjectsWithEnough = Object.entries(subjectStats).filter(
    ([, stats]) => stats.total >= 5
  ).length;
  const coverageRatio = Math.min(subjectsWithEnough / TOTAL_SUBJECTS, 1);
  const coverageScore = Math.round(coverageRatio * 100);

  // Factor 3: Consistency (15%)
  const consistencyRatio = Math.min(streakDays / 30, 1);
  const consistencyScore = Math.round(consistencyRatio * 100);

  // Factor 4: Confidence calibration (15%)
  let calibrationScore = 0;
  if (certainTotal > 0) {
    calibrationScore = Math.round((certainCorrect / certainTotal) * 100);
  }

  // Factor 5: Recency (10%)
  let recencyScore = 0;
  const now = Date.now();
  const subjectsStudied = Object.values(subjectStats).filter((s) => s.lastStudied);
  if (subjectsStudied.length > 0) {
    const avgDaysSince =
      subjectsStudied.reduce((sum, s) => {
        const daysSince = (now - new Date(s.lastStudied).getTime()) / (1000 * 60 * 60 * 24);
        return sum + daysSince;
      }, 0) / subjectsStudied.length;

    // Score: 100 if studied today, decreasing. 0 if average > 30 days
    recencyScore = Math.max(0, Math.round(100 - (avgDaysSince / 30) * 100));
  }

  // Composite score
  const score = Math.round(
    accuracyScore * 0.4 +
      coverageScore * 0.2 +
      consistencyScore * 0.15 +
      calibrationScore * 0.15 +
      recencyScore * 0.1
  );

  const finalScore = Math.min(Math.max(score, 0), 100);

  // Prediction text
  const estimatedExamScore = Math.round(finalScore * 0.9); // Conservative estimate
  const predictionText =
    totalQuestions < 10
      ? 'Answer more questions to generate a prediction.'
      : `Based on current pace, estimated exam score: ${estimatedExamScore}%. Target: 72%+ to pass.`;

  return {
    score: finalScore,
    breakdown: {
      accuracy: accuracyScore,
      coverage: coverageScore,
      consistency: consistencyScore,
      calibration: calibrationScore,
      recency: recencyScore,
    },
    predictionText,
  };
}
