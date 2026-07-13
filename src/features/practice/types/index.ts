export type PracticeRating = 'forgot' | 'hard' | 'good' | 'easy';

export interface PracticeHistory {
  questionId: string;
  lastSeen: string; // ISO date string
  timesCorrect: number;
  timesWrong: number;
  easeFactor: number;
  interval: number; // days
  nextDue: string; // ISO date string
}

export interface PracticeStats {
  date: string; // YYYY-MM-DD
  count: number;
  streakDays: number;
  lastPracticeDate: string; // YYYY-MM-DD
}
