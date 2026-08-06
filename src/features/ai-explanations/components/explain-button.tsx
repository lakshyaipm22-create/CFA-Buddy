'use client';

import { useState, useCallback } from 'react';
import { ExplanationDisplay } from './explanation-display';

interface ExplainButtonProps {
  questionText: string;
  answerChoices: {
    label: string;
    text: string;
    isCorrect: boolean;
  }[];
  selectedAnswer: string;
  correctAnswer: string;
}

/**
 * "Explain this" button that appears on wrong answers in the review flow.
 * On click, calls the /api/explain endpoint and streams the explanation inline.
 */
export function ExplainButton({
  questionText,
  answerChoices,
  selectedAnswer,
  correctAnswer,
}: ExplainButtonProps) {
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const handleExplain = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setExplanation('');
    setHasRequested(true);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          answerChoices,
          selectedAnswer,
          correctAnswer,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? 'Failed to get explanation');
      }

      const contentType = response.headers.get('Content-Type') ?? '';

      if (contentType.includes('application/json')) {
        // Non-streaming fallback response (no API key configured)
        const data = await response.json();
        setExplanation(data.explanation);
      } else {
        // Streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body available');
        }

        const decoder = new TextDecoder();
        let text = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setExplanation(text);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate explanation';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, questionText, answerChoices, selectedAnswer, correctAnswer]);

  return (
    <div className="mt-4">
      {!hasRequested && (
        <button
          onClick={handleExplain}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: 'rgba(197, 162, 88, 0.12)',
            color: 'var(--accent-secondary)',
            border: '1px solid rgba(197, 162, 88, 0.3)',
          }}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Explain this
        </button>
      )}

      {hasRequested && !isLoading && !error && (
        <button
          onClick={handleExplain}
          className="mb-2 inline-flex items-center gap-1 text-xs transition-all hover:opacity-80"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Regenerate
        </button>
      )}

      <ExplanationDisplay
        explanation={explanation}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
