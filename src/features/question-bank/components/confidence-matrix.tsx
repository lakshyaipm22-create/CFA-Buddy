'use client';

import type { ConfidenceMatrix as ConfidenceMatrixType } from '../types';

interface ConfidenceMatrixProps {
  matrix: ConfidenceMatrixType;
  totalQuestions: number;
}

/**
 * A 6-cell grid visualizing confidence calibration:
 * Rows: Correct / Incorrect
 * Columns: Certain / ThinkSo / Guess
 *
 * Color coding:
 * - Green: Correct + Certain (well calibrated / mastered)
 * - Blue: Correct + ThinkSo (solid understanding)
 * - Yellow: Correct + Guess (lucky guess)
 * - Red: Incorrect + Certain (overconfident / misconception)
 * - Orange: Incorrect + ThinkSo (weak area)
 * - Gray: Incorrect + Guess (knowledge gap)
 */
export function ConfidenceMatrix({ matrix, totalQuestions }: ConfidenceMatrixProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        Confidence Matrix
      </h2>

      {/* Column headers */}
      <div
        className="mb-2 grid grid-cols-3 gap-1 text-center text-xs font-medium"
        style={{ color: 'var(--foreground-secondary)' }}
      >
        <span>Certain</span>
        <span>Think So</span>
        <span>Guess</span>
      </div>

      {/* Correct Row */}
      <div className="mb-1 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
        Correct
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <ConfidenceCell
          label="Mastered"
          count={matrix.mastered}
          total={totalQuestions}
          bgColor="rgba(0, 132, 61, 0.15)"
          textColor="#00843D"
        />
        <ConfidenceCell
          label="Solid"
          count={matrix.solid}
          total={totalQuestions}
          bgColor="rgba(59, 130, 246, 0.15)"
          textColor="#3b82f6"
        />
        <ConfidenceCell
          label="Lucky Guess"
          count={matrix.luckyGuess}
          total={totalQuestions}
          bgColor="rgba(234, 179, 8, 0.15)"
          textColor="#eab308"
        />
      </div>

      {/* Incorrect Row */}
      <div className="mb-1 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
        Incorrect
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ConfidenceCell
          label="Misconception"
          count={matrix.misconception}
          total={totalQuestions}
          bgColor="rgba(239, 68, 68, 0.15)"
          textColor="#ef4444"
        />
        <ConfidenceCell
          label="Weak Area"
          count={matrix.weakArea}
          total={totalQuestions}
          bgColor="rgba(249, 115, 22, 0.15)"
          textColor="#f97316"
        />
        <ConfidenceCell
          label="Knowledge Gap"
          count={matrix.knowledgeGap}
          total={totalQuestions}
          bgColor="rgba(107, 114, 128, 0.15)"
          textColor="#6b7280"
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: '#00843D' }} />
          Calibrated
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: '#ef4444' }} />
          Overconfident
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded" style={{ backgroundColor: '#eab308' }} />
          Lucky
        </span>
      </div>
    </div>
  );
}

function ConfidenceCell({
  label,
  count,
  total,
  bgColor,
  textColor,
}: {
  label: string;
  count: number;
  total: number;
  bgColor: string;
  textColor: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg p-3"
      style={{ backgroundColor: bgColor }}
    >
      <span className="text-2xl font-bold" style={{ color: textColor }}>
        {count}
      </span>
      <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.8 }}>
        {pct}%
      </span>
      <span className="mt-1 text-[10px] font-medium" style={{ color: textColor, opacity: 0.7 }}>
        {label}
      </span>
    </div>
  );
}
