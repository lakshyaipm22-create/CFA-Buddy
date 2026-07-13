'use client';

import { getXPForNextLevel } from '../utils/gamification-storage';

interface XPLevelBadgeProps {
  xp: number;
  level: number;
  compact?: boolean;
}

export function XPLevelBadge({ xp, level, compact = false }: XPLevelBadgeProps) {
  const { current, needed, progress } = getXPForNextLevel(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 items-center rounded-md px-2 text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, #C5A258, #E8D5A3)',
            color: '#002B5C',
          }}
        >
          Lv.{level}
        </span>
        <div
          className="hidden h-1.5 w-16 overflow-hidden rounded-full sm:block"
          style={{ background: 'var(--header-input-bg)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #C5A258, #E8D5A3)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          background: 'linear-gradient(135deg, #C5A258, #E8D5A3)',
          color: '#002B5C',
        }}
      >
        {level}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-primary)]">Level {level}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {current} / {needed} XP
          </span>
        </div>
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--border-primary)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #C5A258, #E8D5A3)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
