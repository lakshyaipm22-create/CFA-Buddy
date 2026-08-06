'use client';

import { useState, useEffect } from 'react';

/**
 * Offline Indicator
 *
 * Shows a subtle banner when the app detects it is offline.
 * Uses navigator.onLine and online/offline events for real-time detection.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-600/95 px-4 py-2 text-sm font-medium text-white shadow-md backdrop-blur-sm"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01"
        />
      </svg>
      <span>You are offline. Cached content is still available.</span>
    </div>
  );
}
