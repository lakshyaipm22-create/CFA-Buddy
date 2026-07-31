import type { PracticeAttempt } from '../types/attempt';

export interface TimelineEntry {
  date: string;
  score: number;
  percentage: number;
  attemptId: string;
  subjectName: string;
}

export interface TrendLine {
  slope: number;
  intercept: number;
  r2: number;
}

/**
 * Build a chronological timeline of all attempt scores.
 * Returns entries sorted by completedAt date (earliest first).
 */
export function buildProgressTimeline(attempts: PracticeAttempt[]): TimelineEntry[] {
  if (attempts.length === 0) return [];

  return [...attempts]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map(attempt => ({
      date: attempt.completedAt,
      score: attempt.overallScore,
      percentage: attempt.overallPercentage,
      attemptId: attempt.id,
      subjectName: attempt.subjectName,
    }));
}

/**
 * Compute a linear regression (least squares) trend line from timeline data.
 * Uses days since first entry as the x-axis.
 * Returns slope (percentage points per day), intercept, and R-squared.
 */
export function computeTrendLine(data: { date: string; percentage: number }[]): TrendLine {
  if (data.length < 2) {
    return { slope: 0, intercept: data.length === 1 ? data[0].percentage : 0, r2: 0 };
  }

  const firstDate = new Date(data[0].date).getTime();
  const points = data.map(d => ({
    x: (new Date(d.date).getTime() - firstDate) / (1000 * 60 * 60 * 24), // days since first
    y: d.percentage,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssTotal = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssResidual = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

/**
 * Predict the score percentage at a future target date using the trend line.
 * Extrapolates from the timeline's first date.
 */
export function predictScoreAtDate(
  timeline: { date: string; percentage: number }[],
  targetDate: string
): number {
  if (timeline.length === 0) return 0;

  const trend = computeTrendLine(timeline);
  const firstDate = new Date(timeline[0].date).getTime();
  const targetTime = new Date(targetDate).getTime();
  const daysDiff = (targetTime - firstDate) / (1000 * 60 * 60 * 24);

  const predicted = trend.slope * daysDiff + trend.intercept;
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(predicted * 10) / 10));
}

/**
 * Compute improvement velocity: percentage points gained per week.
 * Calculated from the time span between first and last entries.
 */
export function computeImprovementVelocity(
  timeline: { date: string; percentage: number }[]
): number {
  if (timeline.length < 2) return 0;

  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  const firstTime = new Date(first.date).getTime();
  const lastTime = new Date(last.date).getTime();
  const weeksElapsed = (lastTime - firstTime) / (1000 * 60 * 60 * 24 * 7);

  if (weeksElapsed === 0) return 0;

  const percentageDiff = last.percentage - first.percentage;
  return Math.round((percentageDiff / weeksElapsed) * 10) / 10;
}
