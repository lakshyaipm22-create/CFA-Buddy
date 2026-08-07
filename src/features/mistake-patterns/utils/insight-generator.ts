/**
 * Insight Generator - Transforms detected patterns into specific,
 * human-readable statements with actual percentages and topic names.
 */

import type { MistakePattern, PatternAnalysis } from '../types';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';
import type { Question } from '@/features/question-bank/types';
import { detectAllPatterns } from './pattern-detector';
import { getCachedAnalysis, saveAnalysisCache } from './pattern-storage';

/**
 * Generate a full pattern analysis with caching.
 * Only re-analyzes when new attempts have been added.
 */
export function generatePatternAnalysis(
  attempts: PracticeAttempt[],
  questions: Question[]
): PatternAnalysis {
  // Check cache first
  const totalAttempts = countTotalQuestionAttempts(attempts);
  const cached = getCachedAnalysis(totalAttempts);
  if (cached) return cached;

  // Run detection
  const patterns = detectAllPatterns(attempts, questions);

  // Generate overall insight
  const overallInsight = generateOverallInsight(patterns, attempts);

  const analysis: PatternAnalysis = {
    patterns,
    overallInsight,
    analyzedAt: new Date().toISOString(),
    totalAttemptsAnalyzed: totalAttempts,
  };

  // Cache results
  saveAnalysisCache(analysis, totalAttempts);

  return analysis;
}

/**
 * Generate a summary insight from all detected patterns.
 */
export function generateOverallInsight(
  patterns: MistakePattern[],
  attempts: PracticeAttempt[]
): string {
  if (patterns.length === 0) {
    if (attempts.length === 0) {
      return 'Complete some practice sessions to start detecting mistake patterns.';
    }
    return 'No significant mistake patterns detected yet. Keep practicing to build more data for analysis.';
  }

  const highSeverity = patterns.filter((p) => p.severity === 'high');
  const totalOccurrences = patterns.reduce((sum, p) => sum + p.occurrenceCount, 0);

  const parts: string[] = [];

  if (highSeverity.length > 0) {
    const topPattern = highSeverity[0];
    parts.push(
      `Your biggest area of concern is ${patternTypeLabel(topPattern.patternType)} affecting ${topPattern.affectedTopics.slice(0, 2).join(' and ')}.`
    );
  }

  parts.push(
    `${patterns.length} pattern${patterns.length > 1 ? 's' : ''} detected across ${totalOccurrences} occurrences.`
  );

  if (patterns.some((p) => p.patternType === 'confidenceMismatch')) {
    parts.push('Watch for overconfidence - some areas where you feel sure have hidden gaps.');
  }

  if (patterns.some((p) => p.patternType === 'timePressure')) {
    parts.push('Time pressure is hurting your accuracy - consider slowing down on uncertain questions.');
  }

  return parts.join(' ');
}

/**
 * Generate a specific actionable insight string for a single pattern.
 */
export function generatePatternInsight(pattern: MistakePattern): string {
  switch (pattern.patternType) {
    case 'conceptConfusion':
      return `Concept confusion: ${pattern.description} (${pattern.occurrenceCount} instances detected)`;
    case 'framingTrap':
      return `Framing sensitivity: ${pattern.description} Practice with varied question styles.`;
    case 'calculationError':
      return `Calculation errors: ${pattern.description} Double-check your math.`;
    case 'timePressure':
      return `Time pressure effect: ${pattern.description}`;
    case 'confidenceMismatch':
      return `Overconfidence alert: ${pattern.description}`;
    default:
      return pattern.description;
  }
}

function patternTypeLabel(type: MistakePattern['patternType']): string {
  switch (type) {
    case 'conceptConfusion': return 'concept confusion';
    case 'framingTrap': return 'framing sensitivity';
    case 'calculationError': return 'calculation errors';
    case 'timePressure': return 'time pressure';
    case 'confidenceMismatch': return 'overconfidence';
  }
}

function countTotalQuestionAttempts(attempts: PracticeAttempt[]): number {
  let count = 0;
  for (const a of attempts) {
    for (const m of a.moduleResults) {
      count += m.questionAttempts.length;
    }
  }
  return count;
}
