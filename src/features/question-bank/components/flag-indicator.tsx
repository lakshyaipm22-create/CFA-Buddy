'use client';

import { Flag } from 'lucide-react';

interface FlagIndicatorProps {
  /** Whether the question is flagged */
  flagged: boolean;
  /** Callback when flag is toggled */
  onToggle?: () => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** If true, renders as an interactive button; otherwise as a static indicator */
  interactive?: boolean;
}

/**
 * Flag indicator for use in navigation panels during test sessions.
 * Can be interactive (toggleable) or static (display only).
 */
export function FlagIndicator({
  flagged,
  onToggle,
  size = 'md',
  interactive = true,
}: FlagIndicatorProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const padding = size === 'sm' ? 'p-0.5' : 'p-1.5';

  if (!interactive) {
    if (!flagged) return null;
    return (
      <span
        className={`inline-flex items-center ${padding}`}
        style={{ color: '#f97316' }}
        title="Flagged for review"
        aria-label="Flagged for review"
      >
        <Flag className={iconSize} fill="currentColor" />
      </span>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`rounded transition-colors ${padding} ${
        flagged ? 'bg-orange-900/30 text-orange-400' : ''
      }`}
      style={flagged ? undefined : { color: 'var(--foreground-secondary)' }}
      title={flagged ? 'Remove flag' : 'Flag for review'}
      aria-label={flagged ? 'Remove flag' : 'Flag for review'}
    >
      <Flag className={iconSize} fill={flagged ? 'currentColor' : 'none'} />
    </button>
  );
}

/**
 * Compact flag indicator for use in grid navigation cells.
 * Shows a small colored dot when flagged.
 */
export function FlagDot({ flagged }: { flagged: boolean }) {
  if (!flagged) return null;
  return (
    <span
      className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
      style={{ backgroundColor: '#f97316' }}
      title="Flagged"
    />
  );
}
