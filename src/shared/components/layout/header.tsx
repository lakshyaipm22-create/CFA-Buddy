'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Sun, Moon, Play } from 'lucide-react';
import { useTheme } from '@/shared/components/layout/theme-provider';
import { XPLevelBadge } from '@/features/gamification/components/xp-level-badge';
import { getGamificationState } from '@/features/gamification/utils/gamification-storage';
import { calculateReadinessScore } from '@/features/gamification/utils/readiness-score';
import { NotificationDropdown } from './notification-dropdown';

function useHeaderState() {
  const [gamification] = useState(() => {
    if (typeof window === 'undefined') return { xp: 0, level: 0, streakDays: 0 };
    const state = getGamificationState();
    return { xp: state.xp, level: state.level, streakDays: state.streakDays };
  });

  const readinessScore = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    // Minimal readiness calculation for the header indicator
    const result = calculateReadinessScore({
      subjectStats: {},
      streakDays: gamification.streakDays,
      certainCorrect: 0,
      certainTotal: 0,
      totalQuestions: 0,
    });
    return result.score;
  }, [gamification.streakDays]);

  return { gamification, readinessScore };
}

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { gamification, readinessScore } = useHeaderState();

  return (
    <header
      className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6"
      style={{
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
      }}
    >
      {/* Left: Readiness Progress Bar */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
        <ReadinessBar value={readinessScore} />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Start Session CTA */}
        <Link
          href="/questions"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90"
          style={{
            background: '#C5A258',
            color: '#ffffff',
          }}
        >
          <Play className="h-3 w-3" />
          <span className="hidden sm:inline">Start Session</span>
        </Link>

        {/* Notification Bell */}
        <NotificationDropdown />

        {/* Level Indicator */}
        <XPLevelBadge xp={gamification.xp} level={gamification.level} compact />

        {/* Search */}
        <button
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors"
          style={{
            background: 'var(--header-input-bg)',
            border: '1px solid var(--header-input-border)',
            color: 'var(--header-text)',
          }}
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd
            className="ml-2 hidden rounded px-1.5 py-0.5 text-xs sm:inline"
            style={{ background: 'var(--header-kbd-bg)', color: 'var(--header-kbd-text)' }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{
            background: 'var(--header-input-bg)',
            border: '1px solid var(--header-input-border)',
            color: 'var(--header-text)',
          }}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

/**
 * Compact horizontal readiness progress bar with tooltip-like label.
 */
function ReadinessBar({ value }: { value: number }) {
  const color = value >= 70 ? '#00843D' : value >= 40 ? '#C5A258' : '#FF6B6B';
  const label = value > 0 ? `${value}% Ready` : 'Start studying to track readiness';

  return (
    <div className="flex w-full max-w-xs items-center gap-2" title={label}>
      <span className="whitespace-nowrap text-[10px] font-medium" style={{ color: 'var(--header-text)' }}>
        Readiness
      </span>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full"
        style={{ background: 'var(--header-input-bg)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.max(value, 2)}%`,
            background: color,
          }}
        />
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>
        {value > 0 ? `${value}%` : '--'}
      </span>
    </div>
  );
}
