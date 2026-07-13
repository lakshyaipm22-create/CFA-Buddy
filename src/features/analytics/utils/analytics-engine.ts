import type { QuestionSession } from '@/features/question-bank/types';
import type {
  AnalyticsSession,
  AggregateStats,
  SessionFilter,
  SortOption,
  ConfidenceBreakdown,
} from '../types';

/**
 * Compute analytics stats for a single session.
 */
export function computeSessionStats(session: QuestionSession): AnalyticsSession {
  const attempts = session.attempts ?? [];
  const totalQuestions = attempts.length;
  const correctAnswers = attempts.filter(a => a.correct).length;
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // Duration calculation
  let durationSeconds = 0;
  if (session.startedAt && session.completedAt) {
    durationSeconds = Math.max(
      0,
      Math.floor(
        (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
      )
    );
  } else {
    // Fallback: sum of time spent on each attempt
    durationSeconds = attempts.reduce((sum, a) => sum + (a.timeSpentSeconds ?? 0), 0);
  }

  // Confidence breakdown
  const confidenceBreakdown: ConfidenceBreakdown = {
    certain: attempts.filter(a => a.confidence === 'Certain').length,
    certainCorrect: attempts.filter(a => a.confidence === 'Certain' && a.correct).length,
    thinkSo: attempts.filter(a => a.confidence === 'ThinkSo').length,
    guess: attempts.filter(a => a.confidence === 'Guess').length,
    total: totalQuestions,
  };

  // Confidence matrix
  const confidenceMatrix = {
    mastered: attempts.filter(a => a.correct && a.confidence === 'Certain').length,
    solid: attempts.filter(a => a.correct && a.confidence === 'ThinkSo').length,
    luckyGuess: attempts.filter(a => a.correct && a.confidence === 'Guess').length,
    misconception: attempts.filter(a => !a.correct && a.confidence === 'Certain').length,
    weakArea: attempts.filter(a => !a.correct && a.confidence === 'ThinkSo').length,
    knowledgeGap: attempts.filter(a => !a.correct && a.confidence === 'Guess').length,
  };

  return {
    id: session.id,
    mode: session.mode,
    subject: session.config?.subject ?? null,
    topic: session.config?.topic ?? null,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalQuestions,
    correctAnswers,
    accuracy,
    durationSeconds,
    confidenceBreakdown,
    isTimed: session.config?.timeLimit != null && session.config.timeLimit > 0,
    confidenceMatrix,
  };
}

/**
 * Compute aggregate statistics across all sessions.
 */
export function computeAggregateStats(analyticsSessions: AnalyticsSession[]): AggregateStats {
  if (analyticsSessions.length === 0) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      overallAccuracy: 0,
      averageDurationSeconds: 0,
      bestScore: null,
      accuracyTrend: 'flat',
      totalStudyTimeSeconds: 0,
    };
  }

  const totalSessions = analyticsSessions.length;
  const totalQuestions = analyticsSessions.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalCorrect = analyticsSessions.reduce((sum, s) => sum + s.correctAnswers, 0);
  const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalStudyTimeSeconds = analyticsSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const averageDurationSeconds =
    totalSessions > 0 ? Math.round(totalStudyTimeSeconds / totalSessions) : 0;

  // Best score
  let bestScore: AggregateStats['bestScore'] = null;
  for (const s of analyticsSessions) {
    if (s.totalQuestions > 0) {
      if (!bestScore || s.accuracy > bestScore.accuracy) {
        bestScore = {
          accuracy: s.accuracy,
          date: s.completedAt ?? s.startedAt,
        };
      }
    }
  }

  // Accuracy trend: compare last 7 days vs previous 7 days
  const accuracyTrend = getAccuracyDirection(analyticsSessions);

  return {
    totalSessions,
    totalQuestions,
    overallAccuracy,
    averageDurationSeconds,
    bestScore,
    accuracyTrend,
    totalStudyTimeSeconds,
  };
}

/**
 * Determine if accuracy is trending up, down, or flat.
 */
function getAccuracyDirection(sessions: AnalyticsSession[]): 'up' | 'down' | 'flat' {
  if (sessions.length < 2) return 'flat';

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentSessions = sessions.filter(s => {
    const d = new Date(s.startedAt);
    return d >= sevenDaysAgo && d <= now;
  });

  const previousSessions = sessions.filter(s => {
    const d = new Date(s.startedAt);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  if (recentSessions.length === 0 || previousSessions.length === 0) return 'flat';

  const recentAccuracy = computeGroupAccuracy(recentSessions);
  const previousAccuracy = computeGroupAccuracy(previousSessions);

  const diff = recentAccuracy - previousAccuracy;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'flat';
}

function computeGroupAccuracy(sessions: AnalyticsSession[]): number {
  const totalQ = sessions.reduce((s, sess) => s + sess.totalQuestions, 0);
  const totalC = sessions.reduce((s, sess) => s + sess.correctAnswers, 0);
  return totalQ > 0 ? (totalC / totalQ) * 100 : 0;
}

/**
 * Filter sessions based on the filter criteria.
 */
export function filterSessions(
  sessions: AnalyticsSession[],
  filter: SessionFilter
): AnalyticsSession[] {
  let filtered = [...sessions];

  // Date range filter
  if (filter.dateRange !== 'all') {
    const now = new Date();
    const cutoff =
      filter.dateRange === '7d'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    filtered = filtered.filter(s => new Date(s.startedAt) >= cutoff);
  }

  // Subject filter
  if (filter.subject) {
    filtered = filtered.filter(s => s.subject === filter.subject);
  }

  // Mode filter
  if (filter.mode) {
    filtered = filtered.filter(s => s.mode === filter.mode);
  }

  // Score range filter
  if (filter.scoreRange !== 'all') {
    filtered = filtered.filter(s => {
      switch (filter.scoreRange) {
        case 'below60':
          return s.accuracy < 60;
        case '60to80':
          return s.accuracy >= 60 && s.accuracy <= 80;
        case 'above80':
          return s.accuracy > 80;
        default:
          return true;
      }
    });
  }

  return filtered;
}

/**
 * Sort sessions by the given criteria.
 */
export function sortSessions(sessions: AnalyticsSession[], sortBy: SortOption): AnalyticsSession[] {
  const sorted = [...sessions];

  switch (sortBy) {
    case 'date':
      return sorted.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    case 'score':
      return sorted.sort((a, b) => b.accuracy - a.accuracy);
    case 'duration':
      return sorted.sort((a, b) => b.durationSeconds - a.durationSeconds);
    default:
      return sorted;
  }
}
