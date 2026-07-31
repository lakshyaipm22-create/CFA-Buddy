/**
 * Time Analysis Utilities
 * Functions for analyzing time-related patterns in practice attempts.
 */

import type { AttemptQuestion, PracticeAttempt } from '../types/attempt';
import type { Question } from '../types';

export interface TimeVsCorrectnessPoint {
  questionId: string;
  timeSpentSeconds: number;
  correct: boolean;
}

export interface TimeVsCorrectnessResult {
  correctPoints: TimeVsCorrectnessPoint[];
  incorrectPoints: TimeVsCorrectnessPoint[];
  averageTimeCorrect: number;
  averageTimeIncorrect: number;
}

export interface TimeTrendPoint {
  attemptNumber: number;
  attemptLabel: string;
  avgTimeSeconds: number;
  date: string;
}

export interface SlowestQuestion {
  questionId: string;
  timeSpentSeconds: number;
  correct: boolean;
  questionText: string;
  subject: string;
}

export type PaceCategory = 'Rushing' | 'Optimal' | 'Overthinking';

export interface PaceAnalysis {
  category: PaceCategory;
  averageTime: number;
  medianTime: number;
  p25: number;
  p75: number;
  p90: number;
  totalQuestions: number;
  recommendation: string;
}

/**
 * Compute time vs correctness data for scatter plot visualization.
 * Splits attempts into correct and incorrect buckets with their time values.
 */
export function computeTimeVsCorrectness(
  attempts: AttemptQuestion[]
): TimeVsCorrectnessResult {
  const correctPoints: TimeVsCorrectnessPoint[] = [];
  const incorrectPoints: TimeVsCorrectnessPoint[] = [];

  for (const attempt of attempts) {
    const point: TimeVsCorrectnessPoint = {
      questionId: attempt.questionId,
      timeSpentSeconds: attempt.timeSpentSeconds,
      correct: attempt.correct,
    };
    if (attempt.correct) {
      correctPoints.push(point);
    } else {
      incorrectPoints.push(point);
    }
  }

  const averageTimeCorrect =
    correctPoints.length > 0
      ? correctPoints.reduce((sum, p) => sum + p.timeSpentSeconds, 0) / correctPoints.length
      : 0;

  const averageTimeIncorrect =
    incorrectPoints.length > 0
      ? incorrectPoints.reduce((sum, p) => sum + p.timeSpentSeconds, 0) / incorrectPoints.length
      : 0;

  return {
    correctPoints,
    incorrectPoints,
    averageTimeCorrect,
    averageTimeIncorrect,
  };
}

/**
 * Compute average time trends across multiple practice attempts over time.
 */
export function computeTimeTrends(
  attempts: PracticeAttempt[]
): TimeTrendPoint[] {
  if (attempts.length === 0) return [];

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  return sorted.map((attempt, index) => ({
    attemptNumber: index + 1,
    attemptLabel: `#${attempt.attemptNumber}`,
    avgTimeSeconds: attempt.avgTimePerQuestion,
    date: new Date(attempt.completedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));
}

/**
 * Identify the slowest questions from attempt data.
 * Returns questions that took the longest time, matched with their metadata.
 */
export function identifySlowestQuestions(
  attempts: AttemptQuestion[],
  questions: Question[],
  topN: number = 10
): SlowestQuestion[] {
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  const sorted = [...attempts].sort(
    (a, b) => b.timeSpentSeconds - a.timeSpentSeconds
  );

  const results: SlowestQuestion[] = [];
  const seen = new Set<string>();

  for (const attempt of sorted) {
    if (results.length >= topN) break;
    if (seen.has(attempt.questionId)) continue;
    seen.add(attempt.questionId);

    const question = questionMap.get(attempt.questionId);
    results.push({
      questionId: attempt.questionId,
      timeSpentSeconds: attempt.timeSpentSeconds,
      correct: attempt.correct,
      questionText: question?.questionText ?? 'Unknown Question',
      subject: question?.subject ?? 'Unknown',
    });
  }

  return results;
}

/**
 * Compute the median of an array of numbers.
 */
function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute a percentile value from an array of numbers.
 */
function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

/**
 * Analyze the user's pace and categorize it.
 * Rushing: <30s average
 * Optimal: 30-90s average
 * Overthinking: >90s average
 */
export function computePaceAnalysis(
  attempts: AttemptQuestion[]
): PaceAnalysis {
  if (attempts.length === 0) {
    return {
      category: 'Optimal',
      averageTime: 0,
      medianTime: 0,
      p25: 0,
      p75: 0,
      p90: 0,
      totalQuestions: 0,
      recommendation: 'Complete some questions to see pace analysis.',
    };
  }

  const times = attempts.map(a => a.timeSpentSeconds);
  const averageTime = times.reduce((sum, t) => sum + t, 0) / times.length;
  const medianTime = computeMedian(times);
  const p25 = computePercentile(times, 25);
  const p75 = computePercentile(times, 75);
  const p90 = computePercentile(times, 90);

  let category: PaceCategory;
  let recommendation: string;

  if (averageTime < 30) {
    category = 'Rushing';
    recommendation =
      'You are answering too quickly. Slow down to read questions carefully and consider all options before selecting.';
  } else if (averageTime <= 90) {
    category = 'Optimal';
    recommendation =
      'Your pace is well-balanced. You are taking enough time to think through questions without overthinking.';
  } else {
    category = 'Overthinking';
    recommendation =
      'You are spending too long on individual questions. Practice making decisions faster and trust your initial instinct more.';
  }

  return {
    category,
    averageTime,
    medianTime,
    p25,
    p75,
    p90,
    totalQuestions: attempts.length,
    recommendation,
  };
}
