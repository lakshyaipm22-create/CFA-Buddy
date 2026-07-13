'use client';

import { TrendingUp, TrendingDown, Minus, Clock, Target, Trophy, Hash, Activity } from 'lucide-react';
import type { AggregateStats } from '../types';
import { formatDuration } from '../utils/time-utils';

interface AggregateStatsPanelProps {
  stats: AggregateStats;
}

export function AggregateStatsPanel({ stats }: AggregateStatsPanelProps) {
  const trendIcon =
    stats.accuracyTrend === 'up' ? (
      <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
    ) : stats.accuracyTrend === 'down' ? (
      <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
    ) : (
      <Minus className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
    );

  const trendLabel =
    stats.accuracyTrend === 'up'
      ? 'Improving'
      : stats.accuracyTrend === 'down'
        ? 'Declining'
        : 'Stable';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <StatCard
        icon={<Hash className="h-4 w-4" />}
        label="Total Sessions"
        value={String(stats.totalSessions)}
        color="var(--accent-primary)"
      />
      <StatCard
        icon={<Target className="h-4 w-4" />}
        label="Questions Attempted"
        value={String(stats.totalQuestions)}
        color="var(--accent-secondary)"
      />
      <StatCard
        icon={<Activity className="h-4 w-4" />}
        label="Overall Accuracy"
        value={`${stats.overallAccuracy.toFixed(1)}%`}
        color="var(--accent-success)"
      />
      <StatCard
        icon={<Clock className="h-4 w-4" />}
        label="Avg Duration"
        value={formatDuration(stats.averageDurationSeconds)}
        color="var(--accent-primary)"
      />
      <StatCard
        icon={<Trophy className="h-4 w-4" />}
        label="Best Score"
        value={stats.bestScore ? `${stats.bestScore.accuracy.toFixed(1)}%` : '--'}
        subtitle={
          stats.bestScore
            ? new Date(stats.bestScore.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : undefined
        }
        color="var(--accent-secondary)"
      />
      <StatCard
        icon={trendIcon}
        label="Accuracy Trend"
        value={trendLabel}
        color={
          stats.accuracyTrend === 'up'
            ? 'var(--accent-success)'
            : stats.accuracyTrend === 'down'
              ? '#ef4444'
              : 'var(--foreground-secondary)'
        }
      />
      <StatCard
        icon={<Clock className="h-4 w-4" />}
        label="Total Study Time"
        value={formatDuration(stats.totalStudyTimeSeconds)}
        color="var(--accent-primary)"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--card-border)',
        background: 'var(--card-bg)',
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          {label}
        </span>
      </div>
      <p className="text-lg font-bold truncate" style={{ color }}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
