'use client';

import { useState, useMemo } from 'react';
import { Trophy, Flame, BookOpen } from 'lucide-react';
import { calculateLeaderboard, type LeaderboardSortKey } from '../utils/leaderboard';
import { getGamificationState } from '@/features/gamification/utils/gamification-storage';
import type { LeaderboardEntry } from '../types';

const TABS: { key: LeaderboardSortKey; label: string; icon: typeof Trophy }[] = [
  { key: 'accuracy', label: 'Accuracy', icon: Trophy },
  { key: 'streak', label: 'Streak', icon: Flame },
  { key: 'questions', label: 'Questions', icon: BookOpen },
];

function getMetricValue(entry: LeaderboardEntry, sortBy: LeaderboardSortKey): string {
  switch (sortBy) {
    case 'accuracy':
      return `${entry.accuracy}%`;
    case 'streak':
      return `${entry.streakDays} days`;
    case 'questions':
      return `${entry.questionsCompleted.toLocaleString()}`;
  }
}

function getRankBadge(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

export function Leaderboard() {
  const [sortBy, setSortBy] = useState<LeaderboardSortKey>('accuracy');

  const entries = useMemo(() => {
    const gamState = getGamificationState();
    const totalQuestions = Object.values(gamState.dailyCounts).reduce((sum, c) => sum + c, 0);

    // Calculate user accuracy from their data (estimate based on level/xp)
    const accuracy = totalQuestions > 0 ? Math.min(95, Math.max(50, 70 + gamState.level * 1.5)) : 0;

    const currentUser = totalQuestions > 0
      ? {
          displayName: 'You',
          accuracy: Math.round(accuracy),
          streakDays: gamState.streakDays,
          questionsCompleted: totalQuestions,
          level: gamState.level,
        }
      : null;

    return calculateLeaderboard(sortBy, currentUser);
  }, [sortBy]);

  return (
    <div className="space-y-4">
      {/* Sort Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--card-bg)' }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = sortBy === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSortBy(tab.key)}
              className="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={{
                background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                color: isActive ? 'var(--nav-active-text)' : 'var(--foreground-secondary)',
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard List */}
      <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {entries.map((entry, index) => {
            const rank = index + 1;
            const badge = getRankBadge(rank);
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  background: entry.isCurrentUser ? 'rgba(197, 162, 88, 0.08)' : undefined,
                  borderLeft: entry.isCurrentUser ? '3px solid #C5A258' : '3px solid transparent',
                }}
              >
                {/* Rank */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                  {badge ? (
                    <span className="text-lg">{badge}</span>
                  ) : (
                    <span
                      className="text-sm font-bold"
                      style={{ color: 'var(--foreground-secondary)' }}
                    >
                      {rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: entry.avatarColor }}
                >
                  {entry.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Name & Level */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="truncate text-sm font-medium"
                      style={{ color: entry.isCurrentUser ? '#C5A258' : 'var(--foreground)' }}
                    >
                      {entry.displayName}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(197, 162, 88, 0.2)', color: '#C5A258' }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    Level {entry.level}
                  </span>
                </div>

                {/* Metric */}
                <div className="text-right">
                  <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                    {getMetricValue(entry, sortBy)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
