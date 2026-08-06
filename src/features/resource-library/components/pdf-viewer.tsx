'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { savePageBookmark } from '../actions/page-bookmark';

interface PdfViewerProps {
  url: string;
  resourceId: string;
}

const PAGE_BOOKMARK_KEY_PREFIX = 'pdf-page-';
const SAVE_DEBOUNCE_MS = 2000;

/**
 * PDF Viewer using native browser PDF rendering via iframe.
 *
 * Using an iframe is simpler and more reliable than react-pdf for large files:
 * - Handles 6000+ page documents natively
 * - Browser's built-in PDF viewer handles zoom, search, page navigation
 * - No extra JS bundle cost
 * - Works on all modern browsers
 *
 * Page bookmarking auto-saves last position via localStorage and
 * persists to DB when available.
 */
export function PdfViewer({ url, resourceId }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPageRef = useRef<number>(1);

  // Restore last page from localStorage
  const storageKey = `${PAGE_BOOKMARK_KEY_PREFIX}${resourceId}`;
  const [savedPage] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(storageKey);
  });

  // Append page number to URL if we have a saved position
  const pdfUrl = savedPage ? `${url}#page=${savedPage}` : url;

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  /**
   * Save the current page position to both localStorage and the server.
   * Debounced to avoid excessive writes during rapid navigation.
   */
  const savePosition = useCallback((pageNumber: number) => {
    currentPageRef.current = pageNumber;

    // Save to localStorage immediately
    localStorage.setItem(storageKey, String(pageNumber));

    // Debounce server-side save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void savePageBookmark({ resourceId, pageNumber });
    }, SAVE_DEBOUNCE_MS);
  }, [resourceId, storageKey]);

  // Listen for hash changes which may indicate page navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/page=(\d+)/);
      if (match) {
        savePosition(parseInt(match[1], 10));
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [savePosition]);

  // Save position on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(storageKey, String(currentPageRef.current));
      localStorage.setItem(`pdf-accessed-${resourceId}`, new Date().toISOString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [resourceId, storageKey]);

  // Cleanup timer on unmount and save final position
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Final save on unmount
      if (currentPageRef.current > 1) {
        localStorage.setItem(storageKey, String(currentPageRef.current));
        void savePageBookmark({ resourceId, pageNumber: currentPageRef.current });
      }
    };
  }, [resourceId, storageKey]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-red-400">Failed to load PDF</p>
        <button
          onClick={() => { setError(false); setLoading(true); }}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
        </div>
      )}
      {savedPage && (
        <div className="absolute right-3 top-3 z-10 rounded bg-zinc-800/80 px-2 py-1 text-xs text-zinc-300">
          Resumed from page {savedPage}
        </div>
      )}
      <iframe
        src={pdfUrl}
        className="h-full w-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        title="PDF Viewer"
        style={{ minHeight: '70vh' }}
      />
    </div>
  );
}
