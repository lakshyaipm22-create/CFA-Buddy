'use client';

import { useState } from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/shared/components/layout/theme-provider';
import { XPLevelBadge } from '@/features/gamification/components/xp-level-badge';
import { getGamificationState } from '@/features/gamification/utils/gamification-storage';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [gamification] = useState(() => {
    if (typeof window === 'undefined') return { xp: 0, level: 0 };
    const state = getGamificationState();
    return { xp: state.xp, level: state.level };
  });

  return (
    <header
      className="flex h-14 items-center justify-between px-6"
      style={{
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
      }}
    >
      <div />
      <div className="flex items-center gap-3">
        {/* Level Indicator */}
        <XPLevelBadge xp={gamification.xp} level={gamification.level} compact />
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
          <span>Search...</span>
          <kbd
            className="ml-2 rounded px-1.5 py-0.5 text-xs"
            style={{ background: 'var(--header-kbd-bg)', color: 'var(--header-kbd-text)' }}
          >
            ⌘K
          </kbd>
        </button>
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
      <div />
    </header>
  );
}
