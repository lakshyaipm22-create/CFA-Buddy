'use client';

import { usePageTracking } from '@/shared/hooks/use-page-tracking';

/**
 * Client component wrapper that tracks page visits.
 * Must be rendered inside a client boundary since the protected layout is a server component.
 * Renders nothing visible.
 */
export function PageTracker() {
  usePageTracking();
  return null;
}
