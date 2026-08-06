'use client';

interface ExplanationDisplayProps {
  explanation: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Renders the AI-generated explanation with loading state, error handling,
 * and formatted text display.
 */
export function ExplanationDisplay({ explanation, isLoading, error }: ExplanationDisplayProps) {
  if (error) {
    return (
      <div
        className="mt-3 rounded-lg p-4 text-sm"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
        }}
      >
        {error}
      </div>
    );
  }

  if (!explanation && !isLoading) {
    return null;
  }

  return (
    <div
      className="mt-3 rounded-lg p-4"
      style={{
        backgroundColor: 'rgba(197, 162, 88, 0.06)',
        border: '1px solid rgba(197, 162, 88, 0.2)',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent-secondary)' }}>
          AI Explanation
        </span>
        {isLoading && (
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full"
            style={{ backgroundColor: 'var(--accent-secondary)' }}
          />
        )}
      </div>
      <div
        className="whitespace-pre-wrap text-sm leading-relaxed"
        style={{ color: 'var(--foreground)' }}
      >
        {explanation}
        {isLoading && !explanation && (
          <span style={{ color: 'var(--foreground-secondary)' }}>Generating explanation...</span>
        )}
      </div>
    </div>
  );
}
