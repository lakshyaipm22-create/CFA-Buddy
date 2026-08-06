'use client';

import { useState, useCallback, useMemo } from 'react';

export interface CursorPaginationOptions<T> {
  /** All items to paginate through */
  items: T[];
  /** Number of items to load per page (default: 20) */
  pageSize?: number;
  /** Function to extract a unique cursor from an item */
  getCursor: (item: T) => string;
}

export interface CursorPaginationResult<T> {
  /** Currently visible items */
  visibleItems: T[];
  /** Whether more items are available to load */
  hasMore: boolean;
  /** Load the next page of items */
  loadMore: () => void;
  /** Reset pagination to initial state */
  reset: () => void;
  /** Current cursor position (last visible item's cursor, or null) */
  cursor: string | null;
  /** Total number of items */
  totalCount: number;
}

/**
 * Reusable hook for cursor-based pagination.
 * Manages cursor state, hasMore flag, and loadMore function.
 * Works with any array of items by slicing based on page size.
 */
export function useCursorPagination<T>({
  items,
  pageSize = 20,
  getCursor,
}: CursorPaginationOptions<T>): CursorPaginationResult<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = visibleCount < items.length;

  const cursor = useMemo(() => {
    if (visibleItems.length === 0) return null;
    return getCursor(visibleItems[visibleItems.length - 1]);
  }, [visibleItems, getCursor]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
  }, [pageSize, items.length]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    reset,
    cursor,
    totalCount: items.length,
  };
}
