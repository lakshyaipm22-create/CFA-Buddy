'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/shared/components/layout/theme-provider';

/**
 * Theme toggle button with sun/moon icons.
 * Persists preference to localStorage via ThemeProvider.
 * Meets WCAG 2.1 AA minimum touch target (44x44px on mobile).
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8"
      style={{
        background: 'var(--header-input-bg)',
        border: '1px solid var(--header-input-border)',
        color: 'var(--header-text)',
      }}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
