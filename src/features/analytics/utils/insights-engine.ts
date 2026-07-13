import type { AnalyticsSession, SmartInsight } from '../types';

/**
 * Generate 3-5 smart insights based on session data analysis.
 */
export function generateSmartInsights(sessions: AnalyticsSession[]): SmartInsight[] {
  if (sessions.length === 0) return [];

  const insights: SmartInsight[] = [];

  // 1. Accuracy improvement rate
  const accuracyInsight = analyzeAccuracyTrend(sessions);
  if (accuracyInsight) insights.push(accuracyInsight);

  // 2. Weakest subject
  const weakestInsight = analyzeWeakestSubject(sessions);
  if (weakestInsight) insights.push(weakestInsight);

  // 3. Guessing warnings
  const guessingInsight = analyzeGuessingBehavior(sessions);
  if (guessingInsight) insights.push(guessingInsight);

  // 4. Time management
  const timeInsight = analyzeTimeManagement(sessions);
  if (timeInsight) insights.push(timeInsight);

  // 5. Confidence calibration
  const calibrationInsight = analyzeCalibration(sessions);
  if (calibrationInsight) insights.push(calibrationInsight);

  // Return at most 5 insights
  return insights.slice(0, 5);
}

function analyzeAccuracyTrend(sessions: AnalyticsSession[]): SmartInsight | null {
  if (sessions.length < 3) return null;

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const recentCount = Math.min(5, Math.floor(sorted.length / 2));
  const recent = sorted.slice(-recentCount);
  const earlier = sorted.slice(0, recentCount);

  const recentAcc = computeGroupAccuracy(recent);
  const earlierAcc = computeGroupAccuracy(earlier);
  const diff = recentAcc - earlierAcc;

  if (Math.abs(diff) < 2) return null;

  if (diff > 0) {
    return {
      id: 'accuracy-improving',
      type: 'success',
      title: 'Accuracy Improving',
      description: `Your recent accuracy is up ${diff.toFixed(1)}% compared to your earlier sessions. Keep up the great work!`,
      metric: `+${diff.toFixed(1)}%`,
    };
  } else {
    return {
      id: 'accuracy-declining',
      type: 'warning',
      title: 'Accuracy Declining',
      description: `Your recent accuracy dropped ${Math.abs(diff).toFixed(1)}%. Consider reviewing weak areas or slowing down.`,
      metric: `${diff.toFixed(1)}%`,
    };
  }
}

function analyzeWeakestSubject(sessions: AnalyticsSession[]): SmartInsight | null {
  const subjectSessions = sessions.filter(s => s.subject);
  if (subjectSessions.length === 0) return null;

  const bySubject: Record<string, { correct: number; total: number }> = {};
  for (const s of subjectSessions) {
    const subject = s.subject!;
    if (!bySubject[subject]) bySubject[subject] = { correct: 0, total: 0 };
    bySubject[subject].correct += s.correctAnswers;
    bySubject[subject].total += s.totalQuestions;
  }

  const entries = Object.entries(bySubject)
    .filter(([, stats]) => stats.total >= 5) // need enough data
    .map(([subject, stats]) => ({
      subject,
      accuracy: (stats.correct / stats.total) * 100,
    }));

  if (entries.length === 0) return null;

  const weakest = entries.sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weakest.accuracy >= 70) return null;

  return {
    id: 'weakest-subject',
    type: 'danger',
    title: `Weak Area: ${weakest.subject}`,
    description: `Your accuracy in ${weakest.subject} is ${weakest.accuracy.toFixed(0)}%. Focus more practice sessions here.`,
    metric: `${weakest.accuracy.toFixed(0)}%`,
  };
}

function analyzeGuessingBehavior(sessions: AnalyticsSession[]): SmartInsight | null {
  const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalGuesses = sessions.reduce((sum, s) => sum + s.confidenceBreakdown.guess, 0);

  if (totalQuestions < 10) return null;

  const guessRate = (totalGuesses / totalQuestions) * 100;

  if (guessRate > 25) {
    return {
      id: 'high-guessing',
      type: 'warning',
      title: 'High Guessing Rate',
      description: `${guessRate.toFixed(0)}% of your answers are guesses. Review fundamentals to build confidence in weak areas.`,
      metric: `${guessRate.toFixed(0)}%`,
    };
  }

  if (guessRate < 10 && totalQuestions > 20) {
    return {
      id: 'low-guessing',
      type: 'success',
      title: 'Strong Knowledge Base',
      description: `Only ${guessRate.toFixed(0)}% guessing rate shows solid topic understanding. Great prep!`,
      metric: `${guessRate.toFixed(0)}%`,
    };
  }

  return null;
}

function analyzeTimeManagement(sessions: AnalyticsSession[]): SmartInsight | null {
  if (sessions.length < 3) return null;

  const timedSessions = sessions.filter(s => s.isTimed && s.totalQuestions > 0);
  if (timedSessions.length === 0) return null;

  const avgTimePerQ =
    timedSessions.reduce((sum, s) => sum + s.durationSeconds / s.totalQuestions, 0) /
    timedSessions.length;

  // CFA exam target: ~90 seconds per question
  if (avgTimePerQ > 120) {
    return {
      id: 'slow-pace',
      type: 'info',
      title: 'Time Management',
      description: `You average ${Math.round(avgTimePerQ)} sec/question in timed sessions. CFA target is ~90 sec. Practice time pressure.`,
      metric: `${Math.round(avgTimePerQ)}s/Q`,
    };
  }

  if (avgTimePerQ < 60 && avgTimePerQ > 0) {
    return {
      id: 'fast-pace',
      type: 'info',
      title: 'Quick Responses',
      description: `Averaging ${Math.round(avgTimePerQ)} sec/question. Make sure speed isn't sacrificing accuracy.`,
      metric: `${Math.round(avgTimePerQ)}s/Q`,
    };
  }

  return null;
}

function analyzeCalibration(sessions: AnalyticsSession[]): SmartInsight | null {
  const totalMisconceptions = sessions.reduce(
    (sum, s) => sum + s.confidenceMatrix.misconception,
    0
  );
  const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);

  if (totalQuestions < 10) return null;

  const misconceptionRate = (totalMisconceptions / totalQuestions) * 100;

  if (misconceptionRate > 15) {
    return {
      id: 'misconception-alert',
      type: 'danger',
      title: 'Confidence Calibration Issue',
      description: `${misconceptionRate.toFixed(0)}% of answers are "Certain" but incorrect. These misconceptions need active correction.`,
      metric: `${misconceptionRate.toFixed(0)}%`,
    };
  }

  return null;
}

function computeGroupAccuracy(sessions: AnalyticsSession[]): number {
  const totalQ = sessions.reduce((s, sess) => s + sess.totalQuestions, 0);
  const totalC = sessions.reduce((s, sess) => s + sess.correctAnswers, 0);
  return totalQ > 0 ? (totalC / totalQ) * 100 : 0;
}
