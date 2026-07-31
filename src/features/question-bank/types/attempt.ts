/**
 * Practice Attempt types for tracking completed practice sessions
 * with module-level breakdown and per-question results.
 */

export interface AttemptQuestion {
  questionId: string;
  selectedAnswer: string;
  correct: boolean;
  timeSpentSeconds: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ModuleResult {
  moduleId: string;
  moduleName: string;
  score: number;
  total: number;
  percentage: number;
  avgTimePerQuestion: number;
  questionAttempts: AttemptQuestion[];
}

export interface PracticeAttempt {
  id: string;
  subjectName: string;
  attemptNumber: number;
  completedAt: string;
  moduleResults: ModuleResult[];
  overallScore: number;
  overallTotal: number;
  overallPercentage: number;
  avgTimePerQuestion: number;
  bookmarkedIds: string[];
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

/**
 * Compute confidence level from overall percentage.
 * >=80% = High, >=60% = Medium, <60% = Low
 */
export function computeConfidenceLevel(percentage: number): 'High' | 'Medium' | 'Low' {
  if (percentage >= 80) return 'High';
  if (percentage >= 60) return 'Medium';
  return 'Low';
}
