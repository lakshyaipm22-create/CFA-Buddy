'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function ProtectedError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Log error for debugging (remove in production if using error reporting service)
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400" />
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Something went wrong</h2>
        <p className="mt-2 text-sm max-w-md" style={{ color: 'var(--foreground-secondary)' }}>
          An unexpected error occurred. This might be caused by corrupted data or a temporary issue.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90"
        style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
      >
        <RotateCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
