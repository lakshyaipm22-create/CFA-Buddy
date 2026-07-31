'use client';

import { useState } from 'react';

const STORAGE_KEY = 'cfa-buddy-imported-questions';
const TIMESTAMP_KEY = 'cfa-buddy-questions-loaded-at';

const PROVIDER_LABELS: Record<string, string> = {
  curriculum: 'Curriculum',
  'premium-practice': 'Premium Practice',
};

function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

interface ProviderCounts {
  total: number;
  byProvider: Record<string, number>;
}

function getStoredCounts(): ProviderCounts {
  if (typeof window === 'undefined') return { total: 0, byProvider: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const byProvider: Record<string, number> = {};
        for (const q of parsed) {
          if (q && typeof q === 'object' && typeof q.provider === 'string') {
            byProvider[q.provider] = (byProvider[q.provider] || 0) + 1;
          }
        }
        return { total: parsed.length, byProvider };
      }
    }
  } catch {
    // ignore parse errors
  }
  return { total: 0, byProvider: {} };
}

export function ImportDashboard() {
  const [counts, setCounts] = useState<ProviderCounts>(() => getStoredCounts());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleReload = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/imported-questions');
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
      const byProvider: Record<string, number> = {};
      for (const q of data) {
        if (q && typeof q === 'object' && typeof q.provider === 'string') {
          byProvider[q.provider] = (byProvider[q.provider] || 0) + 1;
        }
      }
      setCounts({ total: data.length, byProvider });
      setMessage({ type: 'success', text: `${data.length} questions loaded successfully` });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessage({ type: 'error', text: `Failed to load questions: ${errorMsg}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reload Questions Section */}
      <div
        className="rounded-lg border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Question Bank
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Currently loaded: {counts.total} questions
            </p>
            {Object.keys(counts.byProvider).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3">
                {Object.entries(counts.byProvider).sort(([a], [b]) => a.localeCompare(b)).map(([provider, count]) => (
                  <span
                    key={provider}
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs"
                    style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)' }}
                  >
                    {getProviderLabel(provider)}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleReload}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            {isLoading ? 'Loading...' : 'Reload Questions from Server'}
          </button>
        </div>
        {message && (
          <div
            className="mt-3 rounded-md px-3 py-2 text-xs"
            style={{
              background: message.type === 'success' ? 'rgba(0, 132, 61, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: message.type === 'success' ? 'var(--accent-success)' : '#ef4444',
            }}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div
        className="rounded-lg border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>How to Import Questions</h3>
        <div className="mt-3 space-y-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          <p>Run the import CLI from your terminal:</p>
          <pre
            className="mt-2 rounded p-3 text-[11px]"
            style={{ background: 'var(--background-secondary)', color: 'var(--accent-secondary)' }}
          >
{`# Single file (questions only)
npm run import:questions -- --file="content/question-banks/level1/Schweser QB 2024 with Answers/Quantitative Method/Reading 1 Rates and Returns.pdf" --subject="Quantitative Methods" --provider="schweser"

# With paired answer file
npm run import:questions -- --file="questions.pdf" --answers="answers.pdf" --subject="FSA" --provider="schweser"

# Specify provider
npm run import:questions -- --file="path.pdf" --provider="uworld" --subject="Economics"`}
          </pre>
          <p className="mt-3">
            Imported questions will be saved to{' '}
            <code
              className="rounded px-1 py-0.5"
              style={{ background: 'var(--background-secondary)' }}
            >
              content/metadata/imported-questions/
            </code>
          </p>
        </div>
      </div>

      {/* Status */}
      <div
        className="rounded-lg border p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Import Status</h3>
        <p className="mt-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          The Question Import Pipeline extracts questions from your PDF question banks.
          After import, questions become available in the Question Bank for practice sessions.
        </p>
        <div
          className="mt-4 rounded p-4 text-center"
          style={{ background: 'var(--background-secondary)' }}
        >
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Use the CLI to import questions, then click &quot;Reload Questions from Server&quot; to load them into the app.
          </p>
        </div>
      </div>

      {/* Future: Upload/verification UI */}
      <div
        className="rounded-lg border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Web-based verification UI coming in Phase 2.
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)', opacity: 0.6 }}>
          For now, review imported questions in content/metadata/imported-questions/*.json
        </p>
      </div>
    </div>
  );
}
