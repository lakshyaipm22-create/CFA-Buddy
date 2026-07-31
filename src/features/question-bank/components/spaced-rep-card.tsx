'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, CheckCircle, Clock, Layers } from 'lucide-react';
import { getRepetitionStats, getRepetitionQueue } from '../utils/spaced-repetition';
import type { SpacedRepetitionStats } from '../utils/spaced-repetition';

export function SpacedRepCard() {
  const [stats] = useState<SpacedRepetitionStats>(() => getRepetitionStats());
  const [nextBatchCount] = useState<number>(() => {
    const queue = getRepetitionQueue();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return queue.filter(
      item => item.nextDueDate > now.toISOString() && item.nextDueDate <= tomorrow.toISOString()
    ).length;
  });

  const hasDueItems = stats.dueToday > 0;

  return (
    <div
      className="rounded-xl p-5 transition-all duration-300"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: hasDueItems
          ? '2px solid var(--accent-secondary)'
          : '1px solid var(--card-border)',
        boxShadow: hasDueItems ? '0 0 12px rgba(197, 162, 88, 0.15)' : undefined,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw
          className="h-5 w-5"
          style={{ color: hasDueItems ? 'var(--accent-secondary)' : 'var(--foreground-secondary)' }}
        />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          Spaced Repetition
        </h3>
        {hasDueItems && (
          <span
            className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: 'rgba(197, 162, 88, 0.2)', color: 'var(--accent-secondary)' }}
          >
            Review Now
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: hasDueItems ? 'var(--accent-secondary)' : 'var(--foreground-secondary)' }} />
          <div>
            <p className="text-lg font-bold" style={{ color: hasDueItems ? 'var(--accent-secondary)' : 'var(--foreground)' }}>
              {stats.dueToday}
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Due Today</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {nextBatchCount}
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Due Tomorrow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {stats.total}
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>In Queue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-success)' }}>
              {stats.mastered}
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Mastered</p>
          </div>
        </div>
      </div>

      {stats.total > 0 && (
        <Link
          href="/practice?mode=spaced-rep"
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: hasDueItems ? 'var(--accent-secondary)' : 'var(--accent-primary)',
            color: hasDueItems ? '#0a0e14' : 'var(--accent-secondary)',
          }}
        >
          <RefreshCw className="h-4 w-4" />
          {hasDueItems ? `Start Review (${stats.dueToday})` : 'View Queue'}
        </Link>
      )}

      {stats.total === 0 && stats.mastered === 0 && (
        <p className="text-center text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Complete practice attempts to build your review queue.
        </p>
      )}
    </div>
  );
}
