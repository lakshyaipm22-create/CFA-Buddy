'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, ArrowUp } from 'lucide-react';
import type { PracticeAttempt } from '../types/attempt';
import { getTargets } from '../utils/target-storage';
import { CFA_CURRICULUM_WEIGHTS } from '@/shared/config/subjects';

interface GapAnalysisProps {
  attempts: PracticeAttempt[];
}

interface ModuleGap {
  moduleName: string;
  currentScore: number;
  target: number;
  gap: number;
  weight: number;
  weightedPriority: number;
  estimatedQuestions: number;
}

/**
 * Compute gap analysis for all modules from the latest attempt.
 * Exported for testing.
 */
export function computeGapAnalysis(attempts: PracticeAttempt[], targets: Record<string, number>): ModuleGap[] {
  if (attempts.length === 0) return [];

  // Get the latest attempt
  const sorted = [...attempts].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  const latest = sorted[0];

  // Compute average improvement per question from history
  const avgImprovementPerQuestion = computeAvgImprovementPerQuestion(attempts);

  const gaps: ModuleGap[] = latest.moduleResults.map(moduleResult => {
    const target = targets[moduleResult.moduleName] ?? 80;
    const currentScore = moduleResult.percentage;
    const gap = target - currentScore;
    // Look up weight by module name first, then fall back to subject name
    const weight = CFA_CURRICULUM_WEIGHTS[moduleResult.moduleName]
      ?? CFA_CURRICULUM_WEIGHTS[latest.subjectName]
      ?? 0.1;
    const weightedPriority = Math.max(0, gap) * weight;

    // Estimate questions needed to close the gap
    const questionsNeeded = avgImprovementPerQuestion > 0 && gap > 0
      ? Math.ceil(gap / avgImprovementPerQuestion)
      : 0;

    return {
      moduleName: moduleResult.moduleName,
      currentScore,
      target,
      gap,
      weight,
      weightedPriority,
      estimatedQuestions: questionsNeeded,
    };
  });

  // Sort by weighted priority descending (highest priority first)
  return gaps.sort((a, b) => b.weightedPriority - a.weightedPriority);
}

/**
 * Compute the average improvement per question practiced.
 * Uses the difference in overall percentage divided by total questions across attempts.
 */
function computeAvgImprovementPerQuestion(attempts: PracticeAttempt[]): number {
  if (attempts.length < 2) return 2; // Default: 2% per question

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalQuestionsAnswered = sorted.reduce((sum, a) => sum + a.overallTotal, 0);

  if (totalQuestionsAnswered === 0) return 2;

  const improvement = last.overallPercentage - first.overallPercentage;
  const avgPerQuestion = improvement / totalQuestionsAnswered;

  // Ensure a minimum positive rate for estimation
  return Math.max(0.5, avgPerQuestion);
}

export function GapAnalysis({ attempts }: GapAnalysisProps) {
  const [targets] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    return getTargets();
  });

  const gaps = useMemo(() => computeGapAnalysis(attempts, targets), [attempts, targets]);

  if (gaps.length === 0) {
    return null;
  }

  const hasGaps = gaps.some(g => g.gap > 0);

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center gap-2 mb-4">
        <ArrowUp className="h-4 w-4" style={{ color: '#C5A258' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Gap Analysis & Study Priority
        </h3>
      </div>

      {!hasGaps ? (
        <div className="text-center py-4">
          <CheckCircle className="mx-auto h-8 w-8" style={{ color: '#00843D' }} />
          <p className="mt-2 text-sm" style={{ color: '#00843D' }}>
            All modules are at or above target!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap, idx) => (
            <GapCard key={gap.moduleName} gap={gap} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function GapCard({ gap, rank }: { gap: ModuleGap; rank: number }) {
  const isAhead = gap.gap <= 0;
  const gapColor = isAhead ? '#00843D' : '#ef4444';
  const gapText = isAhead ? `+${Math.abs(gap.gap)}%` : `-${gap.gap}%`;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ background: 'var(--nav-hover-bg)' }}
    >
      {/* Priority rank */}
      {!isAhead && (
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: `${gapColor}20`, color: gapColor }}
        >
          {rank}
        </span>
      )}
      {isAhead && (
        <CheckCircle className="flex-shrink-0 h-4 w-4" style={{ color: '#00843D' }} />
      )}

      {/* Module name */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
          {gap.moduleName}
        </p>
        {!isAhead && gap.estimatedQuestions > 0 && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
            ~{gap.estimatedQuestions} more questions to close gap
          </p>
        )}
      </div>

      {/* Score vs Target */}
      <div className="flex items-center gap-2 text-xs">
        <span style={{ color: 'var(--foreground-secondary)' }}>{gap.currentScore}%</span>
        <span style={{ color: 'var(--foreground-secondary)' }}>/</span>
        <span style={{ color: 'var(--foreground-secondary)' }}>{gap.target}%</span>
      </div>

      {/* Gap badge */}
      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: `${gapColor}15`, color: gapColor }}
      >
        {gapText}
      </span>

      {/* Weight indicator */}
      {!isAhead && (
        <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }} title="CFA curriculum weight">
          <AlertTriangle className="inline h-3 w-3 mr-0.5" style={{ color: '#C5A258' }} />
          {Math.round(gap.weight * 100)}%
        </span>
      )}
    </div>
  );
}
