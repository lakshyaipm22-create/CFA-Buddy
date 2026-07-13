export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  earnedAt: string | null;
}

export interface GamificationState {
  xp: number;
  level: number;
  streakDays: number;
  lastActivityDate: string;
  weeklyQuestionsAnswered: number;
  weekStartDate: string;
  badges: Badge[];
  /** Track daily question counts for streak logic: { "2025-01-15": 12, ... } */
  dailyCounts: Record<string, number>;
}

export interface WeeklyGoal {
  target: number;
  current: number;
  weekStart: string;
}

export interface ReadinessBreakdown {
  accuracy: number;
  coverage: number;
  consistency: number;
  calibration: number;
  recency: number;
}

export interface ReadinessResult {
  score: number;
  breakdown: ReadinessBreakdown;
  predictionText: string;
}
