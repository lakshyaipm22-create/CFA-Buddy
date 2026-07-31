/**
 * Subject-level utility functions for aggregating progress data from localStorage.
 * Used by the study hub and learn page to show per-subject metrics.
 */

const SESSIONS_KEY = 'cfa-buddy-sessions';
const ATTEMPTS_KEY = 'cfa-buddy-attempts';

export interface SubjectProgress {
  subjectName: string;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  accuracy: number; // 0-100
  totalSessions: number;
  lastStudied: string | null; // ISO timestamp
  averageTimePerQuestion: number; // seconds
}

export interface SubjectSession {
  id: string;
  mode: string;
  startedAt: string;
  completedAt: string | null;
  questionsAnswered: number;
  totalQuestions: number;
  accuracy: number;
}

export interface SubjectWeakArea {
  topic: string;
  accuracy: number;
  totalQuestions: number;
  incorrectCount: number;
}

interface StoredSession {
  id: string;
  mode: string;
  config: { subject?: string; questionCount: number };
  status: string;
  startedAt: string;
  completedAt: string | null;
  attempts: Array<{
    questionId: string;
    correct: boolean;
    timestamp: string;
    timeSpentSeconds: number;
    confidence: string;
  }>;
  questionIds: string[];
}

interface StoredAttempt {
  id: string;
  subjectName: string;
  completedAt: string;
  overallScore: number;
  overallTotal: number;
  overallPercentage: number;
  avgTimePerQuestion: number;
  moduleResults: Array<{
    moduleName: string;
    score: number;
    total: number;
    percentage: number;
    questionAttempts: Array<{
      questionId: string;
      correct: boolean;
    }>;
  }>;
}

function getSessions(): StoredSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function getAttempts(): StoredAttempt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Get subject sessions that match a given subject name.
 * Sessions store subject as comma-separated in config.subject.
 */
function getSubjectSessions(subjectName: string): StoredSession[] {
  const sessions = getSessions();
  return sessions.filter((s) => {
    if (!s.config.subject) return false;
    const subjects = s.config.subject.split(',').map((x) => x.trim().toLowerCase());
    return subjects.includes(subjectName.toLowerCase());
  });
}

/**
 * Get aggregated progress for a specific subject.
 */
export function getSubjectProgress(subjectName: string): SubjectProgress {
  const sessions = getSubjectSessions(subjectName);
  const attempts = getAttempts().filter(
    (a) => a.subjectName.toLowerCase() === subjectName.toLowerCase()
  );

  let totalQuestionsAnswered = 0;
  let correctAnswers = 0;
  let totalTimeSpent = 0;
  let lastStudied: string | null = null;

  // Aggregate from sessions
  for (const session of sessions) {
    for (const attempt of session.attempts) {
      totalQuestionsAnswered++;
      if (attempt.correct) correctAnswers++;
      totalTimeSpent += attempt.timeSpentSeconds || 0;
    }
    const sessionDate = session.completedAt || session.startedAt;
    if (!lastStudied || sessionDate > lastStudied) {
      lastStudied = sessionDate;
    }
  }

  // Aggregate from practice attempts
  for (const attempt of attempts) {
    totalQuestionsAnswered += attempt.overallTotal;
    correctAnswers += attempt.overallScore;
    totalTimeSpent += attempt.avgTimePerQuestion * attempt.overallTotal;
    if (!lastStudied || attempt.completedAt > lastStudied) {
      lastStudied = attempt.completedAt;
    }
  }

  const accuracy =
    totalQuestionsAnswered > 0
      ? Math.round((correctAnswers / totalQuestionsAnswered) * 100)
      : 0;

  const averageTimePerQuestion =
    totalQuestionsAnswered > 0
      ? Math.round(totalTimeSpent / totalQuestionsAnswered)
      : 0;

  return {
    subjectName,
    totalQuestionsAnswered,
    correctAnswers,
    accuracy,
    totalSessions: sessions.length + attempts.length,
    lastStudied,
    averageTimePerQuestion,
  };
}

/**
 * Get recent sessions for a specific subject.
 */
export function getSubjectRecentSessions(
  subjectName: string,
  limit: number = 5
): SubjectSession[] {
  const sessions = getSubjectSessions(subjectName);
  const completedSessions = sessions
    .filter((s) => s.status === 'completed')
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.startedAt).getTime() -
        new Date(a.completedAt || a.startedAt).getTime()
    )
    .slice(0, limit);

  return completedSessions.map((s) => {
    const correct = s.attempts.filter((a) => a.correct).length;
    const total = s.attempts.length;
    return {
      id: s.id,
      mode: s.mode,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      questionsAnswered: total,
      totalQuestions: s.questionIds.length,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });
}

/**
 * Get weak areas (topics with lowest accuracy) for a subject from session data.
 */
export function getSubjectWeakAreas(subjectName: string, topN: number = 5): SubjectWeakArea[] {
  const attempts = getAttempts().filter(
    (a) => a.subjectName.toLowerCase() === subjectName.toLowerCase()
  );

  // Aggregate by module (which corresponds to topics/readings)
  const topicStats: Record<string, { correct: number; total: number }> = {};

  for (const attempt of attempts) {
    for (const mod of attempt.moduleResults) {
      if (!topicStats[mod.moduleName]) {
        topicStats[mod.moduleName] = { correct: 0, total: 0 };
      }
      topicStats[mod.moduleName].correct += mod.score;
      topicStats[mod.moduleName].total += mod.total;
    }
  }

  return Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      totalQuestions: stats.total,
      incorrectCount: stats.total - stats.correct,
    }))
    .filter((t) => t.totalQuestions >= 2) // Only show topics with meaningful data
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, topN);
}

/**
 * Get progress for all subjects that have session data.
 * Used by the Learn page to show progress indicators.
 */
export function getAllSubjectsProgress(): Map<string, SubjectProgress> {
  const sessions = getSessions();
  const attempts = getAttempts();
  const subjectNames = new Set<string>();

  // Collect all subject names from sessions
  for (const session of sessions) {
    if (session.config.subject) {
      const subjects = session.config.subject.split(',').map((x) => x.trim());
      for (const s of subjects) {
        if (s) subjectNames.add(s);
      }
    }
  }

  // Collect from attempts
  for (const attempt of attempts) {
    if (attempt.subjectName) subjectNames.add(attempt.subjectName);
  }

  const progressMap = new Map<string, SubjectProgress>();
  for (const name of subjectNames) {
    progressMap.set(name.toLowerCase(), getSubjectProgress(name));
  }

  return progressMap;
}

/**
 * Format a relative time string from an ISO timestamp.
 */
export function formatLastStudied(isoString: string | null): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}
