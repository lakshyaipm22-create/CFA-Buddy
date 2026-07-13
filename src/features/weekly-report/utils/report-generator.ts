import type { QuestionSession } from '@/features/question-bank/types';
import type { WeeklySnapshot, WeeklyReport, WeeklyComparison } from '../types';
import { CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';
import {
  getWeeklySnapshots,
  saveWeeklySnapshot,
  getWeekStart,
  getWeekEnd,
  toDateString,
} from './report-storage';

/** CFA curriculum weights converted to percentages for display in focus suggestions. */
const CFA_WEIGHTS_PERCENT: Record<string, number> = Object.fromEntries(
  Object.entries(CFA_CURRICULUM_WEIGHTS).map(([k, v]) => [k, Math.round(v * 100)])
);

interface TimerSession {
  startTime: string;
  endTime: string;
  page?: string;
}

/**
 * Compute the current week snapshot from localStorage data.
 */
export function getCurrentWeekSnapshot(): WeeklySnapshot {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const weekStartStr = toDateString(weekStart);
  const weekEndStr = toDateString(weekEnd);

  // Load sessions
  const sessions = loadSessions();
  const timerSessions = loadTimerSessions();
  const gamificationState = loadGamificationState();

  // Filter sessions for current week
  const weekSessions = sessions.filter((s) => {
    if (s.status !== 'completed') return false;
    const completedDate = s.completedAt ?? s.startedAt;
    if (!completedDate) return false;
    const dateStr = completedDate.split('T')[0];
    return dateStr >= weekStartStr && dateStr <= weekEndStr;
  });

  // Calculate stats
  let totalQuestions = 0;
  let totalCorrect = 0;
  const subjectAccuracy: Record<string, { correct: number; total: number }> = {};
  const subjectsCoveredSet = new Set<string>();

  for (const session of weekSessions) {
    for (const attempt of session.attempts ?? []) {
      totalQuestions++;
      if (attempt.correct) totalCorrect++;
    }

    // Track subject-level accuracy
    const configSubject = session.config?.subject;
    if (configSubject) {
      const subjects = configSubject.split(',').map((s: string) => s.trim());
      for (const subj of subjects) {
        subjectsCoveredSet.add(subj);
        if (!subjectAccuracy[subj]) {
          subjectAccuracy[subj] = { correct: 0, total: 0 };
        }
        if (subjects.length === 1) {
          for (const attempt of session.attempts ?? []) {
            subjectAccuracy[subj].total++;
            if (attempt.correct) subjectAccuracy[subj].correct++;
          }
        }
      }
    }
  }

  // Calculate time studied from timer sessions this week
  let timeStudiedMinutes = 0;
  for (const timer of timerSessions) {
    if (!timer.startTime || !timer.endTime) continue;
    const timerDate = timer.startTime.split('T')[0];
    if (timerDate >= weekStartStr && timerDate <= weekEndStr) {
      const start = new Date(timer.startTime).getTime();
      const end = new Date(timer.endTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        timeStudiedMinutes += (end - start) / 60000;
      }
    }
  }

  const accuracy = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    questionsAnswered: totalQuestions,
    accuracy,
    timeStudiedMinutes: Math.round(timeStudiedMinutes),
    subjectsCovered: Array.from(subjectsCoveredSet),
    subjectAccuracy,
    streakDays: gamificationState.streakDays ?? 0,
    xp: gamificationState.xp ?? 0,
  };
}

/**
 * Generate a full weekly report with comparisons, strengths, weaknesses, and focus suggestions.
 */
export function generateWeeklyReport(): WeeklyReport {
  const current = getCurrentWeekSnapshot();

  // Save the current snapshot for future trend tracking
  saveWeeklySnapshot(current);

  // Find previous week snapshot
  const snapshots = getWeeklySnapshots();
  const previousWeekStart = new Date(current.weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekStartStr = toDateString(previousWeekStart);
  const previous = snapshots.find((s) => s.weekStart === previousWeekStartStr) ?? null;

  // Calculate comparison
  const comparison: WeeklyComparison = {
    accuracyDelta: previous ? current.accuracy - previous.accuracy : 0,
    questionsDelta: previous ? current.questionsAnswered - previous.questionsAnswered : 0,
    timeDelta: previous ? current.timeStudiedMinutes - previous.timeStudiedMinutes : 0,
  };

  // Identify strengths (top 3 by accuracy, min 3 questions)
  const subjectEntries = Object.entries(current.subjectAccuracy)
    .filter(([, data]) => data.total >= 3)
    .map(([subject, data]) => ({
      subject,
      accuracy: Math.round((data.correct / data.total) * 100),
      total: data.total,
    }));

  subjectEntries.sort((a, b) => b.accuracy - a.accuracy);
  const strengths = subjectEntries.slice(0, 3).map((e) => e.subject);

  // Identify weaknesses (bottom 3 by accuracy, min 2 questions)
  const weakEntries = Object.entries(current.subjectAccuracy)
    .filter(([, data]) => data.total >= 2)
    .map(([subject, data]) => ({
      subject,
      accuracy: Math.round((data.correct / data.total) * 100),
      total: data.total,
    }));

  weakEntries.sort((a, b) => a.accuracy - b.accuracy);
  const weaknesses = weakEntries.slice(0, 3).map((e) => e.subject);

  // Generate suggested focus
  const suggestedFocus = generateFocusSuggestions(current, weaknesses);

  return {
    current,
    previous,
    strengths,
    weaknesses,
    suggestedFocus,
    comparison,
  };
}

/**
 * Generate focus suggestions based on weaknesses, coverage gaps, and CFA weights.
 */
function generateFocusSuggestions(
  snapshot: WeeklySnapshot,
  weaknesses: string[]
): string[] {
  const suggestions: string[] = [];
  const coveredSet = new Set(snapshot.subjectsCovered);

  // Suggest weak subjects with high CFA weight
  for (const subject of weaknesses) {
    const weight = CFA_WEIGHTS_PERCENT[subject];
    if (weight && weight >= 10) {
      suggestions.push(
        `Focus on ${subject} (${weight}% of exam, needs improvement)`
      );
    } else if (weight) {
      suggestions.push(
        `Review ${subject} (accuracy below target)`
      );
    }
    if (suggestions.length >= 2) break;
  }

  // Suggest high-weight subjects not covered this week
  const allSubjects = Object.entries(CFA_WEIGHTS_PERCENT)
    .sort(([, a], [, b]) => b - a);

  for (const [subject, weight] of allSubjects) {
    if (suggestions.length >= 4) break;
    if (!coveredSet.has(subject) && weight >= 10) {
      suggestions.push(
        `Start practicing ${subject} (${weight}% of exam, not covered this week)`
      );
    }
  }

  // If still short, add generic suggestions
  if (suggestions.length === 0) {
    suggestions.push('Great start! Try covering more subjects to build breadth');
  }

  return suggestions.slice(0, 4);
}

// ─── Helper functions to load data from localStorage ───

function loadSessions(): QuestionSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('cfa-buddy-sessions') ?? '[]');
  } catch {
    return [];
  }
}

function loadTimerSessions(): TimerSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('cfa-buddy-study-timer') ?? '[]');
  } catch {
    return [];
  }
}

function loadGamificationState(): { streakDays: number; xp: number } {
  if (typeof window === 'undefined') return { streakDays: 0, xp: 0 };
  try {
    const data = JSON.parse(localStorage.getItem('cfa-buddy-gamification') ?? '{}');
    return { streakDays: data.streakDays ?? 0, xp: data.xp ?? 0 };
  } catch {
    return { streakDays: 0, xp: 0 };
  }
}
