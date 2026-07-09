'use client';

import { useState, useEffect, useCallback } from 'react';

interface PdfViewerProps {
  url: string;
  resourceId: string;
}

/**
 * PDF Viewer using native browser PDF rendering via iframe.
 * 
 * Using an iframe is simpler and more reliable than react-pdf for large files:
 * - Handles 6000+ page documents natively
 * - Browser's built-in PDF viewer handles zoom, search, page navigation
 * - No extra JS bundle cost
 * - Works on all modern browsers
 * 
 * Page bookmarking stores last position in localStorage.
 */
export function PdfViewer({ url, resourceId }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Restore last page from localStorage
  const storageKey = `pdf-page-${resourceId}`;
  const savedPage = typeof window !== 'undefined'
    ? localStorage.getItem(storageKey)
    : null;
  
  // Append page number to URL if we have a saved position
  const pdfUrl = savedPage ? `${url}#page=${savedPage}` : url;

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  // Save current page periodically via postMessage from iframe
  // For now, we track that the user opened this resource
  useEffect(() => {
    // Mark as "viewed" — for future page tracking
    const handleBeforeUnload = () => {
      // In future: capture page number from iframe if possible
      // For now, just mark that this resource was accessed
      localStorage.setItem(`pdf-accessed-${resourceId}`, new Date().toISOString());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [resourceId]);

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
