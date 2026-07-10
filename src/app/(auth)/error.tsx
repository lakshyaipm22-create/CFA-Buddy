'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

export default function AuthError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400" />
      <div>
        <h2 className="text-lg font-semibold text-white">Authentication Error</h2>
        <p className="mt-2 text-sm text-zinc-400">Something went wrong with authentication. Please try again.</p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg bg-[#002B5C] px-5 py-2.5 text-sm font-medium text-[#C5A258] hover:opacity-90"
      >
        <RotateCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
