import type { TestMode, Confidence, ConfidenceMatrix } from '@/features/question-bank/types';

export interface AnalyticsSession {
  id: string;
  mode: TestMode;
  subject: string | null;
  topic: string | null;
  startedAt: string;
  completedAt: string | null;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  durationSeconds: number;
  confidenceBreakdown: ConfidenceBreakdown;
  isTimed: boolean;
  confidenceMatrix: ConfidenceMatrix;
}

export interface ConfidenceBreakdown {
  certain: number;
  certainCorrect: number;
  thinkSo: number;
  guess: number;
  total: number;
}

export interface AggregateStats {
  totalSessions: number;
  totalQuestions: number;
  overallAccuracy: number;
  averageDurationSeconds: number;
  bestScore: { accuracy: number; date: string } | null;
  accuracyTrend: 'up' | 'down' | 'flat';
  totalStudyTimeSeconds: number;
}

export interface SessionFilter {
  dateRange: 'all' | '7d' | '30d';
  subject: string | null;
  mode: TestMode | null;
  scoreRange: 'all' | 'below60' | '60to80' | 'above80';
}

export type SortOption = 'date' | 'score' | 'duration';

export interface SubjectBreakdown {
  subject: string;
  correct: number;
  total: number;
  accuracy: number;
  timeSpentSeconds: number;
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

export interface SmartInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  metric?: string;
}

export interface TimeAnalysis {
  averagePerQuestion: number;
  fastestSession: number;
  slowestSession: number;
  optimalTimeRange: [number, number];
}

export type { Confidence, TestMode };
