/**
 * Mistake Pattern AI - Type definitions for deep pattern analysis
 * that goes beyond simple topic-level accuracy.
 */

export type PatternType =
  | 'conceptConfusion'
  | 'framingTrap'
  | 'calculationError'
  | 'timePressure'
  | 'confidenceMismatch';

export type PatternSeverity = 'high' | 'medium' | 'low';

export interface QuestionExample {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  topic: string;
}

export interface MistakePattern {
  id: string;
  patternType: PatternType;
  description: string;
  affectedTopics: string[];
  occurrenceCount: number;
  examples: QuestionExample[];
  severity: PatternSeverity;
  recommendation: string;
  /** Percentage that quantifies this pattern (e.g., error rate, correlation) */
  percentage: number;
}

export interface PatternAnalysis {
  patterns: MistakePattern[];
  overallInsight: string;
  analyzedAt: string;
  totalAttemptsAnalyzed: number;
}

export interface PatternCache {
  analysis: PatternAnalysis;
  lastAttemptCount: number;
  cachedAt: string;
}
