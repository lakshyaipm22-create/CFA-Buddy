'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { savePageBookmark } from '../actions/page-bookmark';

interface PdfViewerProps {
  url: string;
  resourceId: string;
  totalPages?: number;
}

const PAGE_BOOKMARK_KEY_PREFIX = 'pdf-page-';
const SAVE_DEBOUNCE_MS = 2000;

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400];
const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

/**
 * Enhanced PDF Viewer with page-at-a-time navigation, zoom controls,
 * go-to-page input, and thumbnail sidebar.
 *
 * Uses an iframe for rendering with controls overlaid.
 */
export function PdfViewer({ url, resourceId, totalPages: initialTotalPages }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [goToPageInput, setGoToPageInput] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Total pages - stored in localStorage or passed as prop
  const [totalPages] = useState<number>(() => {
    if (initialTotalPages) return initialTotalPages;
    if (typeof window === 'undefined') return 1;
    const stored = localStorage.getItem(`pdf-pages-${resourceId}`);
    return stored ? parseInt(stored, 10) : 1;
  });

  // Current page from localStorage (lazy initializer)
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const stored = localStorage.getItem(`${PAGE_BOOKMARK_KEY_PREFIX}${resourceId}`);
    return stored ? parseInt(stored, 10) : 1;
  });

  const storageKey = `${PAGE_BOOKMARK_KEY_PREFIX}${resourceId}`;

  // Build the PDF URL with page fragment
  const pdfUrl = `${url}#page=${currentPage}`;

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  /**
   * Save the current page position to both localStorage and the server.
   */
  const savePosition = useCallback((pageNumber: number) => {
    localStorage.setItem(storageKey, String(pageNumber));

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void savePageBookmark({ resourceId, pageNumber });
    }, SAVE_DEBOUNCE_MS);
  }, [resourceId, storageKey]);

  // Navigate to a specific page
  const goToPage = useCallback((page: number) => {
    const clampedPage = Math.max(1, Math.min(page, totalPages || 9999));
    setCurrentPage(clampedPage);
    savePosition(clampedPage);
  }, [totalPages, savePosition]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const nextLevel = ZOOM_LEVELS.find(z => z > prev);
      return nextLevel ?? MAX_ZOOM;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const prevLevel = [...ZOOM_LEVELS].reverse().find(z => z < prev);
      return prevLevel ?? MIN_ZOOM;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  // Handle go-to-page form submission
  const handleGoToPage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(goToPageInput, 10);
    if (!isNaN(page) && page > 0) {
      goToPage(page);
      setGoToPageInput('');
    }
  }, [goToPageInput, goToPage]);

  // Keyboard shortcuts for zoom and page navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetZoom();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom, nextPage, prevPage]);

  // Save position on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(storageKey, String(currentPage));
      localStorage.setItem(`pdf-accessed-${resourceId}`, new Date().toISOString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [resourceId, storageKey, currentPage]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

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
    <div className="relative flex h-full w-full flex-col">
      {/* Control Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-2">
        {/* Left: Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous page (Left Arrow)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-sm text-zinc-300">
            Page <strong>{currentPage}</strong>
            {totalPages > 1 && <span className="text-zinc-500"> of {totalPages}</span>}
          </span>

          <button
            onClick={nextPage}
            disabled={totalPages > 1 && currentPage >= totalPages}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next page (Right Arrow)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Go to page input */}
          <form onSubmit={handleGoToPage} className="ml-2 flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={totalPages > 1 ? totalPages : undefined}
              value={goToPageInput}
              onChange={(e) => setGoToPageInput(e.target.value)}
              placeholder="Go to"
              className="w-16 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-[#C5A258] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-[#002B5C] px-2 py-1 text-xs text-[#C5A258] hover:bg-[#003875]"
            >
              Go
            </button>
          </form>
        </div>

        {/* Center: Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-30"
            title="Zoom out (-)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          <button
            onClick={resetZoom}
            className="min-w-[48px] rounded px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            title="Reset zoom"
          >
            {zoom}%
          </button>

          <button
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-30"
            title="Zoom in (+)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Right: Thumbnail toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`rounded p-1.5 transition-colors ${
              showThumbnails ? 'bg-[#002B5C] text-[#C5A258]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title="Toggle thumbnail sidebar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Thumbnail Sidebar */}
        {showThumbnails && totalPages > 1 && (
          <div className="w-32 flex-shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-2">
            <div className="space-y-2">
              {Array.from({ length: Math.min(totalPages, 50) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-full rounded border p-1 text-center text-[10px] transition-colors ${
                    page === currentPage
                      ? 'border-[#C5A258] bg-[#002B5C]/30 text-[#C5A258]'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  <div className="aspect-[3/4] rounded bg-zinc-800/50 mb-0.5 flex items-center justify-center">
                    <span className="text-lg font-bold opacity-30">{page}</span>
                  </div>
                  Page {page}
                </button>
              ))}
              {totalPages > 50 && (
                <p className="py-2 text-center text-[9px] text-zinc-600">
                  Showing first 50 of {totalPages} pages
                </p>
              )}
            </div>
          </div>
        )}

        {/* PDF Content */}
        <div className="relative flex-1 overflow-auto">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
            </div>
          )}
          <div
            className="h-full w-full origin-top-left"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          >
            <iframe
              key={`${url}-page-${currentPage}`}
              src={pdfUrl}
              className="h-full w-full border-0"
              onLoad={handleLoad}
              onError={handleError}
              title="PDF Viewer"
              style={{ minHeight: '70vh' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
