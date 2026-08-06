/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useCursorPagination } from '../hooks/use-cursor-pagination';

interface TestItem {
  id: string;
  value: number;
}

describe('Cursor Pagination Property Tests', () => {
  it('total visible items after loading all pages equals total items', () => {
    const itemCountArb = fc.integer({ min: 0, max: 100 });
    const pageSizeArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(itemCountArb, pageSizeArb, (itemCount, pageSize) => {
        const items: TestItem[] = Array.from({ length: itemCount }, (_, i) => ({
          id: `item-${i}`,
          value: i,
        }));

        const { result } = renderHook(() =>
          useCursorPagination({
            items,
            pageSize,
            getCursor: (item) => item.id,
          })
        );

        // Load all pages
        let safetyCounter = 0;
        while (result.current.hasMore && safetyCounter < 200) {
          act(() => {
            result.current.loadMore();
          });
          safetyCounter++;
        }

        expect(result.current.visibleItems.length).toBe(items.length);
        expect(result.current.hasMore).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it('visible items never contain duplicates', () => {
    const itemCountArb = fc.integer({ min: 1, max: 80 });
    const pageSizeArb = fc.integer({ min: 1, max: 30 });
    const loadCountArb = fc.integer({ min: 0, max: 5 });

    fc.assert(
      fc.property(itemCountArb, pageSizeArb, loadCountArb, (itemCount, pageSize, loadCount) => {
        const items: TestItem[] = Array.from({ length: itemCount }, (_, i) => ({
          id: `item-${i}`,
          value: i,
        }));

        const { result } = renderHook(() =>
          useCursorPagination({
            items,
            pageSize,
            getCursor: (item) => item.id,
          })
        );

        // Load several pages
        for (let i = 0; i < loadCount; i++) {
          if (result.current.hasMore) {
            act(() => {
              result.current.loadMore();
            });
          }
        }

        // Check no duplicates in visible items
        const ids = result.current.visibleItems.map((item) => item.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
      }),
      { numRuns: 50 }
    );
  });

  it('initial page size matches min of pageSize and total items', () => {
    const itemCountArb = fc.integer({ min: 0, max: 100 });
    const pageSizeArb = fc.integer({ min: 1, max: 50 });

    fc.assert(
      fc.property(itemCountArb, pageSizeArb, (itemCount, pageSize) => {
        const items: TestItem[] = Array.from({ length: itemCount }, (_, i) => ({
          id: `item-${i}`,
          value: i,
        }));

        const { result } = renderHook(() =>
          useCursorPagination({
            items,
            pageSize,
            getCursor: (item) => item.id,
          })
        );

        const expectedInitialCount = Math.min(pageSize, items.length);
        expect(result.current.visibleItems.length).toBe(expectedInitialCount);
      }),
      { numRuns: 50 }
    );
  });

  it('reset returns to initial page state', () => {
    const itemCountArb = fc.integer({ min: 5, max: 60 });
    const pageSizeArb = fc.integer({ min: 1, max: 10 });
    const loadCountArb = fc.integer({ min: 1, max: 5 });

    fc.assert(
      fc.property(itemCountArb, pageSizeArb, loadCountArb, (itemCount, pageSize, loadCount) => {
        const items: TestItem[] = Array.from({ length: itemCount }, (_, i) => ({
          id: `item-${i}`,
          value: i,
        }));

        const { result } = renderHook(() =>
          useCursorPagination({
            items,
            pageSize,
            getCursor: (item) => item.id,
          })
        );

        // Load multiple pages
        for (let i = 0; i < loadCount; i++) {
          if (result.current.hasMore) {
            act(() => {
              result.current.loadMore();
            });
          }
        }

        // Reset
        act(() => {
          result.current.reset();
        });

        const expectedAfterReset = Math.min(pageSize, items.length);
        expect(result.current.visibleItems.length).toBe(expectedAfterReset);
      }),
      { numRuns: 50 }
    );
  });
});
