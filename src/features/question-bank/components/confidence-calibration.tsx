'use client';

import type { PracticeAttempt } from '../types/attempt';
import type { ConfidenceMatrix } from '../types';

interface ConfidenceCalibrationProps {
  attempt: PracticeAttempt;
}

/**
 * Build a confidence matrix from AttemptQuestion data.
 * Maps High -> Certain, Medium -> ThinkSo, Low -> Guess
 * to match the ConfidenceMatrix type structure.
 */
export function buildAttemptConfidenceMatrix(attempt: PracticeAttempt): ConfidenceMatrix {
  const matrix: ConfidenceMatrix = {
    mastered: 0,
    solid: 0,
    luckyGuess: 0,
    misconception: 0,
    weakArea: 0,
    knowledgeGap: 0,
  };

  for (const mod of attempt.moduleResults) {
    for (const qa of mod.questionAttempts) {
      if (qa.correct) {
        switch (qa.confidence) {
          case 'High': matrix.mastered++; break;
          case 'Medium': matrix.solid++; break;
          case 'Low': matrix.luckyGuess++; break;
        }
      } else {
        switch (qa.confidence) {
          case 'High': matrix.misconception++; break;
          case 'Medium': matrix.weakArea++; break;
          case 'Low': matrix.knowledgeGap++; break;
        }
      }
    }
  }

  return matrix;
}

interface CellData {
  label: string;
  description: string;
  count: number;
  percentage: number;
  isDangerous: boolean;
  bgColor: string;
  textColor: string;
}

export function ConfidenceCalibration({ attempt }: ConfidenceCalibrationProps) {
  const matrix = buildAttemptConfidenceMatrix(attempt);
  const total = attempt.overallTotal;

  const cells: CellData[][] = [
    // Row 1: Confident (High -> Certain)
    [
      {
        label: 'Mastered',
        description: 'Confident + Correct',
        count: matrix.mastered,
        percentage: total > 0 ? Math.round((matrix.mastered / total) * 100) : 0,
        isDangerous: false,
        bgColor: 'rgba(0, 132, 61, 0.12)',
        textColor: 'var(--accent-success)',
      },
      {
        label: 'Dangerous Misconception',
        description: 'Confident + Incorrect',
        count: matrix.misconception,
        percentage: total > 0 ? Math.round((matrix.misconception / total) * 100) : 0,
        isDangerous: true,
        bgColor: 'rgba(239, 68, 68, 0.12)',
        textColor: '#ef4444',
      },
    ],
    // Row 2: ThinkSo (Medium)
    [
      {
        label: 'Solid',
        description: 'Somewhat Sure + Correct',
        count: matrix.solid,
        percentage: total > 0 ? Math.round((matrix.solid / total) * 100) : 0,
        isDangerous: false,
        bgColor: 'rgba(197, 162, 88, 0.12)',
        textColor: 'var(--accent-secondary)',
      },
      {
        label: 'Weak Area',
        description: 'Somewhat Sure + Incorrect',
        count: matrix.weakArea,
        percentage: total > 0 ? Math.round((matrix.weakArea / total) * 100) : 0,
        isDangerous: false,
        bgColor: 'rgba(249, 115, 22, 0.12)',
        textColor: '#f97316',
      },
    ],
    // Row 3: Guess (Low)
    [
      {
        label: 'Lucky Guess',
        description: 'Guessing + Correct',
        count: matrix.luckyGuess,
        percentage: total > 0 ? Math.round((matrix.luckyGuess / total) * 100) : 0,
        isDangerous: false,
        bgColor: 'rgba(6, 182, 212, 0.12)',
        textColor: '#06b6d4',
      },
      {
        label: 'Knowledge Gap',
        description: 'Guessing + Incorrect',
        count: matrix.knowledgeGap,
        percentage: total > 0 ? Math.round((matrix.knowledgeGap / total) * 100) : 0,
        isDangerous: false,
        bgColor: 'rgba(107, 114, 128, 0.12)',
        textColor: '#6b7280',
      },
    ],
  ];

  const rowLabels = ['Confident', 'Think So', 'Guess'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Confidence Calibration Matrix
        </h3>
        <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {total} questions total
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2">
        <div />
        <div className="text-center text-xs font-medium" style={{ color: 'var(--accent-success)' }}>
          Correct
        </div>
        <div className="text-center text-xs font-medium" style={{ color: '#ef4444' }}>
          Incorrect
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2">
        {cells.map((row, rowIdx) => (
          <div key={rowIdx} className="contents">
            {/* Row label */}
            <div className="flex items-center">
              <span className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                {rowLabels[rowIdx]}
              </span>
            </div>
            {/* Cells */}
            {row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="rounded-lg p-3 text-center transition-all"
                style={{
                  backgroundColor: cell.bgColor,
                  border: cell.isDangerous && cell.count > 0
                    ? '2px solid #ef4444'
                    : '1px solid var(--card-border)',
                }}
              >
                <p className="text-lg font-bold" style={{ color: cell.textColor }}>
                  {cell.count}
                </p>
                <p className="text-xs font-medium" style={{ color: cell.textColor }}>
                  {cell.percentage}%
                </p>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                  {cell.label}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Warning for misconceptions */}
      {matrix.misconception > 0 && (
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
            Warning: {matrix.misconception} question{matrix.misconception > 1 ? 's' : ''} where you felt confident but got wrong.
            These misconceptions are the most dangerous -- review them carefully.
          </p>
        </div>
      )}
    </div>
  );
}
