'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to enable j/k keyboard navigation on a list of items.
 * Listens for 'list-nav-down', 'list-nav-up', and 'shortcut-open-item' events
 * dispatched by the global useKeyboardShortcuts hook.
 *
 * @param itemCount - Total number of navigable items in the list
 * @param onSelect - Callback when Enter/shortcut-open-item fires on the focused item
 * @returns { focusedIndex, setFocusedIndex, listRef }
 */
export function useListNavigation(
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback((index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-list-item]');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handleDown = () => {
      setFocusedIndex((prev) => {
        const next = Math.min(prev + 1, itemCount - 1);
        scrollToIndex(next);
        return next;
      });
    };

    const handleUp = () => {
      setFocusedIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        scrollToIndex(next);
        return next;
      });
    };

    const handleOpen = () => {
      setFocusedIndex((current) => {
        if (current >= 0 && onSelect) {
          onSelect(current);
        } else if (current >= 0 && listRef.current) {
          // Fallback: click the focused item's first link/button
          const items = listRef.current.querySelectorAll('[data-list-item]');
          const focused = items[current];
          if (focused) {
            const link = focused.querySelector('a, button') as HTMLElement | null;
            link?.click();
          }
        }
        return current;
      });
    };

    document.addEventListener('list-nav-down', handleDown);
    document.addEventListener('list-nav-up', handleUp);
    document.addEventListener('shortcut-open-item', handleOpen);

    return () => {
      document.removeEventListener('list-nav-down', handleDown);
      document.removeEventListener('list-nav-up', handleUp);
      document.removeEventListener('shortcut-open-item', handleOpen);
    };
  }, [itemCount, onSelect, scrollToIndex]);

  // Reset focused index when item count changes
  const clampedFocusedIndex = focusedIndex >= itemCount ? itemCount - 1 : focusedIndex;

  return { focusedIndex: clampedFocusedIndex, setFocusedIndex, listRef };
}
