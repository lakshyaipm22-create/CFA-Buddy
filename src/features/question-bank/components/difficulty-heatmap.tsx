'use client';

import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Star, ArrowRight } from 'lucide-react';
import type { PracticeAttempt } from '../types/attempt';
import { loadAllQuestions } from '../utils/question-loader';
import {
  computeDifficultyStats,
  generateDifficultyHeatmapData,
  computeReadinessRecommendation,
} from '../utils/difficulty-progression';
import type { DifficultyLevel, ReadinessLevel } from '../utils/difficulty-progression';

interface DifficultyHeatmapProps {
  attempt: PracticeAttempt;
  allAttempts: PracticeAttempt[];
}

function getAccuracyColor(accuracy: number, total: number): string {
  if (total === 0) return 'var(--card-border)';
  if (accuracy < 50) return '#ef4444';
  if (accuracy <= 75) return 'var(--accent-primary)';
  return 'var(--accent-success)';
}

function getAccuracyBg(accuracy: number, total: number): string {
  if (total === 0) return 'rgba(107, 114, 128, 0.1)';
  if (accuracy < 50) return 'rgba(239, 68, 68, 0.15)';
  if (accuracy <= 75) return 'rgba(197, 162, 88, 0.15)';
  return 'rgba(0, 132, 61, 0.15)';
}

const LEVEL_CONFIG: Record<ReadinessLevel, { icon: typeof TrendingUp; color: string; bgColor: string }> = {
  ready_for_medium: { icon: ArrowRight, color: 'var(--accent-success)', bgColor: 'rgba(0, 132, 61, 0.1)' },
  ready_for_hard: { icon: TrendingUp, color: 'var(--accent-success)', bgColor: 'rgba(0, 132, 61, 0.1)' },
  master_easy: { icon: AlertTriangle, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
  master_medium: { icon: AlertTriangle, color: 'var(--accent-primary)', bgColor: 'rgba(197, 162, 88, 0.1)' },
  mastered_all: { icon: Star, color: 'var(--accent-success)', bgColor: 'rgba(0, 132, 61, 0.1)' },
};

export function DifficultyHeatmap({ allAttempts }: DifficultyHeatmapProps) {
  const questions = useMemo(() => loadAllQuestions(), []);

  const stats = useMemo(
    () => computeDifficultyStats(allAttempts, questions),
    [allAttempts, questions]
  );

  const heatmapData = useMemo(
    () => generateDifficultyHeatmapData(stats),
    [stats]
  );

  const recommendations = useMemo(
    () => computeReadinessRecommendation(stats),
    [stats]
  );

  const columns: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];

  if (stats.modules.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>
          No difficulty data available. Complete some practice attempts to see your progression.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Overall Difficulty Performance
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {columns.map(difficulty => {
            const data = stats.overall[difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'];
            return (
              <div
                key={difficulty}
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: getAccuracyBg(data.accuracy, data.total) }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  {difficulty}
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ color: data.total > 0 ? getAccuracyColor(data.accuracy, data.total) : 'var(--foreground-secondary)' }}
                >
                  {data.total > 0 ? `${data.accuracy}%` : '-'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                  {data.correct}/{data.total} correct
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Difficulty Heatmap by Module
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left p-3 text-sm font-medium"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  Module
                </th>
                {columns.map(col => (
                  <th
                    key={col}
                    className="text-center p-3 text-sm font-medium"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.rows.map(moduleName => {
                const moduleCells = heatmapData.cells.filter(c => c.moduleName === moduleName);
                return (
                  <tr key={moduleName} style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="p-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {moduleName}
                    </td>
                    {columns.map(difficulty => {
                      const cell = moduleCells.find(c => c.difficulty === difficulty);
                      const accuracy = cell?.accuracy ?? 0;
                      const total = cell?.total ?? 0;
                      return (
                        <td key={difficulty} className="p-2 text-center">
                          <div
                            className="rounded-lg p-3 mx-auto max-w-[120px]"
                            style={{ backgroundColor: getAccuracyBg(accuracy, total) }}
                          >
                            <span
                              className="text-lg font-bold"
                              style={{ color: total > 0 ? getAccuracyColor(accuracy, total) : 'var(--foreground-secondary)' }}
                            >
                              {total > 0 ? `${accuracy}%` : '-'}
                            </span>
                            {total > 0 && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
                                {cell?.correct}/{total}
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Color legend */}
        <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }} />
            &lt;50%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: 'rgba(197, 162, 88, 0.5)' }} />
            50-75%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: 'rgba(0, 132, 61, 0.5)' }} />
            &gt;75%
          </span>
        </div>
      </div>

      {/* Readiness Recommendations */}
      {recommendations.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Readiness Recommendations
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommendations.map(rec => {
              const config = LEVEL_CONFIG[rec.level];
              const Icon = config.icon;
              return (
                <div
                  key={rec.moduleName}
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{
                    backgroundColor: config.bgColor,
                    border: `1px solid ${config.color}20`,
                  }}
                >
                  <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: config.color }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {rec.moduleName}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                      {rec.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
