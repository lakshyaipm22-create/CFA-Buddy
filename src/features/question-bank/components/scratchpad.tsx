'use client';

import { useState, useCallback } from 'react';
import { StickyNote, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface ScratchpadProps {
  /** The session ID for keying localStorage */
  sessionId: string;
  /** The question index for keying localStorage */
  questionIndex: number;
  /** Whether the panel starts expanded */
  defaultExpanded?: boolean;
  /** Callback when the expanded state changes */
  onToggle?: (expanded: boolean) => void;
}

const SCRATCH_PREFIX = 'scratch-';

/**
 * Per-question scratch notepad for use during test sessions.
 * Data is keyed by session + question index and cleared when the session ends.
 */
export function Scratchpad({
  sessionId,
  questionIndex,
  defaultExpanded = false,
  onToggle,
}: ScratchpadProps) {
  const storageKey = `${SCRATCH_PREFIX}${sessionId}-${questionIndex}`;

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [content, setContent] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(`${SCRATCH_PREFIX}${sessionId}-${questionIndex}`) ?? '';
  });

  // Use a key-based reset by tracking the previous storageKey
  const [trackedKey, setTrackedKey] = useState(storageKey);
  if (trackedKey !== storageKey) {
    setTrackedKey(storageKey);
    const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) ?? '' : '';
    setContent(saved);
  }

  const handleChange = useCallback((value: string) => {
    setContent(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, value);
    }
  }, [storageKey]);

  const handleClear = useCallback(() => {
    setContent('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onToggle?.(next);
  }, [expanded, onToggle]);

  return (
    <div
      className="rounded-lg border transition-all duration-200"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      {/* Header / Toggle */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        aria-expanded={expanded}
        aria-controls="scratchpad-content"
      >
        <span className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5" style={{ color: '#C5A258' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            Scratchpad
          </span>
          {content.length > 0 && !expanded && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(197, 162, 88, 0.15)', color: '#C5A258' }}>
              has notes
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" style={{ color: 'var(--foreground-secondary)' }} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--foreground-secondary)' }} />
        )}
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div id="scratchpad-content" className="border-t px-3 pb-3 pt-2" style={{ borderColor: 'var(--card-border)' }}>
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full resize-none rounded-md bg-transparent p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C5A258]/30"
            style={{ color: 'var(--foreground)', minHeight: '80px' }}
            rows={4}
            placeholder="Jot down working notes, calculations, or key points..."
            aria-label="Scratchpad notes"
          />
          {content.length > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                {content.length} chars
              </span>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors hover:bg-red-900/20 hover:text-red-400"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                <Trash2 className="h-2.5 w-2.5" />
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Clears all scratchpad entries for a given session.
 * Should be called when a session ends.
 */
export function clearSessionScratchpad(sessionId: string): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${SCRATCH_PREFIX}${sessionId}-`)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
