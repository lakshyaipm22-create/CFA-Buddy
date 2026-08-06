'use client';

import { useState, useCallback } from 'react';
import { Bookmark } from 'lucide-react';
import { toggleQuestionBookmark } from '@/shared/actions/bookmarks';

const GLOBAL_BOOKMARKS_KEY = 'cfa-buddy-question-bookmarks';

function getGlobalBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GLOBAL_BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setGlobalBookmarks(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GLOBAL_BOOKMARKS_KEY, JSON.stringify(ids));
}

interface BookmarkButtonProps {
  questionId: string;
  /** Initial bookmark state. If not provided, reads from localStorage. */
  initialBookmarked?: boolean;
  /** Optional size variant */
  size?: 'sm' | 'md';
  /** Callback when bookmark state changes */
  onToggle?: (bookmarked: boolean) => void;
}

/**
 * Toggle bookmark button for questions.
 * Persists to localStorage (and server via Server Action when available).
 */
export function BookmarkButton({
  questionId,
  initialBookmarked,
  size = 'md',
  onToggle,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState<boolean>(() => {
    if (initialBookmarked !== undefined) return initialBookmarked;
    return getGlobalBookmarks().includes(questionId);
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    const newState = !bookmarked;
    setBookmarked(newState);
    setIsLoading(true);

    // Update localStorage immediately for responsiveness
    const globalBookmarks = getGlobalBookmarks();
    if (newState) {
      if (!globalBookmarks.includes(questionId)) {
        setGlobalBookmarks([...globalBookmarks, questionId]);
      }
    } else {
      setGlobalBookmarks(globalBookmarks.filter(id => id !== questionId));
    }

    // Notify parent
    onToggle?.(newState);

    // Attempt server persist (non-blocking)
    try {
      await toggleQuestionBookmark({ questionId, bookmarked: newState });
    } catch {
      // Server action failed - localStorage already updated, so state is preserved
    } finally {
      setIsLoading(false);
    }
  }, [bookmarked, questionId, onToggle]);

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const padding = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`rounded transition-colors ${padding} ${
        bookmarked ? 'bg-yellow-900/30 text-yellow-400' : ''
      } disabled:opacity-50`}
      style={bookmarked ? undefined : { color: 'var(--foreground-secondary)' }}
      title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Bookmark className={iconSize} fill={bookmarked ? 'currentColor' : 'none'} />
    </button>
  );
}
