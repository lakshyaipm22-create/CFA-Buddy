import type { AnalyticsSession, TrendPoint } from '../types';

/**
 * Compute accuracy trend over time, grouped by day.
 */
export function computeAccuracyTrend(sessions: AnalyticsSession[]): TrendPoint[] {
  if (sessions.length === 0) return [];

  const byDay = groupByDay(sessions);
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => {
      const totalQ = daySessions.reduce((sum, s) => sum + s.totalQuestions, 0);
      const totalC = daySessions.reduce((sum, s) => sum + s.correctAnswers, 0);
      const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
      return { date, value: accuracy, label: `${accuracy}%` };
    });
}

/**
 * Compute time investment trend over time, grouped by day.
 */
export function computeTimeTrend(sessions: AnalyticsSession[]): TrendPoint[] {
  if (sessions.length === 0) return [];

  const byDay = groupByDay(sessions);
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => {
      const totalMinutes = Math.round(
        daySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
      );
      return { date, value: totalMinutes, label: `${totalMinutes} min` };
    });
}

/**
 * Compute confidence calibration trend: how well confidence predicts correctness.
 */
export function computeConfidenceCalibration(sessions: AnalyticsSession[]): TrendPoint[] {
  if (sessions.length === 0) return [];

  const byDay = groupByDay(sessions);
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => {
      // Calibration = (certainCorrect + guess_incorrect) / total
      // Higher means confidence aligns better with actual performance
      let calibrated = 0;
      let total = 0;
      for (const s of daySessions) {
        calibrated += s.confidenceMatrix.mastered + s.confidenceMatrix.knowledgeGap;
        total += s.totalQuestions;
      }
      const calibration = total > 0 ? Math.round((calibrated / total) * 100) : 0;
      return { date, value: calibration, label: `${calibration}%` };
    });
}

/**
 * Compute per-subject progression sparkline data.
 */
export function computeSubjectProgression(
  sessions: AnalyticsSession[]
): Record<string, TrendPoint[]> {
  const result: Record<string, TrendPoint[]> = {};

  // Group sessions by subject, then by day
  const bySubject: Record<string, AnalyticsSession[]> = {};
  for (const s of sessions) {
    const subject = s.subject ?? 'Mixed';
    if (!bySubject[subject]) bySubject[subject] = [];
    bySubject[subject].push(s);
  }

  for (const [subject, subjectSessions] of Object.entries(bySubject)) {
    const byDay = groupByDay(subjectSessions);
    result[subject] = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, daySessions]) => {
        const totalQ = daySessions.reduce((sum, s) => sum + s.totalQuestions, 0);
        const totalC = daySessions.reduce((sum, s) => sum + s.correctAnswers, 0);
        const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
        return { date, value: accuracy };
      });
  }

  return result;
}

/**
 * Get overall accuracy direction comparing recent vs earlier performance.
 */
export function getAccuracyDirection(sessions: AnalyticsSession[]): 'up' | 'down' | 'flat' {
  if (sessions.length < 2) return 'flat';

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAccuracy = groupAccuracy(firstHalf);
  const secondAccuracy = groupAccuracy(secondHalf);

  const diff = secondAccuracy - firstAccuracy;
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'flat';
}

function groupAccuracy(sessions: AnalyticsSession[]): number {
  const totalQ = sessions.reduce((s, sess) => s + sess.totalQuestions, 0);
  const totalC = sessions.reduce((s, sess) => s + sess.correctAnswers, 0);
  return totalQ > 0 ? (totalC / totalQ) * 100 : 0;
}

function groupByDay(sessions: AnalyticsSession[]): Record<string, AnalyticsSession[]> {
  const byDay: Record<string, AnalyticsSession[]> = {};
  for (const s of sessions) {
    const day = s.startedAt.slice(0, 10); // YYYY-MM-DD
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(s);
  }
  return byDay;
}
