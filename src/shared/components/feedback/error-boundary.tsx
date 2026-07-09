'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorFallback({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-lg border border-red-900/50 bg-red-950/50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-200">Something went wrong</h2>
        <p className="mt-2 text-sm text-red-300/70">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
