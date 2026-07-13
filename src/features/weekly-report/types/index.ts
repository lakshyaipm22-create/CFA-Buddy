/**
 * Weekly Report types for tracking study progress over time.
 */

export interface WeeklySnapshot {
  weekStart: string; // ISO date string (Monday)
  weekEnd: string; // ISO date string (Sunday)
  questionsAnswered: number;
  accuracy: number; // 0-100
  timeStudiedMinutes: number;
  subjectsCovered: string[];
  subjectAccuracy: Record<string, { correct: number; total: number }>;
  streakDays: number;
  xp: number;
}

export interface WeeklyComparison {
  accuracyDelta: number;
  questionsDelta: number;
  timeDelta: number;
}

export interface WeeklyReport {
  current: WeeklySnapshot;
  previous: WeeklySnapshot | null;
  strengths: string[];
  weaknesses: string[];
  suggestedFocus: string[];
  comparison: WeeklyComparison;
}
