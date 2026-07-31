'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordPageVisit } from '@/shared/lib/page-visit-tracker';

/**
 * Map of known paths to human-readable page titles.
 */
const PATH_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/questions': 'Question Bank',
  '/questions/attempts': 'Practice Attempts',
  '/flashcards': 'Flashcards',
  '/resources': 'Resources',
  '/learn': 'Learning Hub',
  '/practice': 'Practice',
  '/review': 'Review Queue',
  '/insights': 'Analytics & Insights',
  '/mistakes': 'Mistakes & Weak Areas',
  '/weekly-report': 'Weekly Report',
  '/settings': 'Settings',
  '/notes': 'Notes',
  '/study-plan': 'Study Plan',
};

/**
 * Resolve a path to a human-readable title.
 * Falls back to capitalizing the last segment.
 */
function resolveTitle(path: string): string {
  if (PATH_TITLES[path]) return PATH_TITLES[path];

  // Try prefix matches for dynamic routes
  for (const [prefix, title] of Object.entries(PATH_TITLES)) {
    if (path.startsWith(prefix + '/')) return title;
  }

  // Fallback: capitalize last segment
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? 'Page';
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
}

/**
 * Hook that records page visits on route changes.
 * Should be used in a client component that renders inside the protected layout.
 */
export function usePageTracking(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      const title = resolveTitle(pathname);
      recordPageVisit(pathname, title);
    }
  }, [pathname]);
}
