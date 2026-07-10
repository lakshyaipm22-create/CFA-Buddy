'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';
import type { QuestionAttempt } from '@/features/question-bank/types';
import { MistakeAnalytics } from './mistake-analytics';
import { useListNavigation } from '@/shared/hooks/use-list-navigation';

interface MistakeEntry {
  attempt: QuestionAttempt;
  questionText: string;
  subject: string;
  classification: string;
}

const emptyArray: Array<{ status: string; attempts?: Array<Record<string, unknown>> }> = [];

// Module-level cache for referential stability
let mistakeCachedRaw: string | null = null;
let mistakeCachedParsed: typeof emptyArray = emptyArray;

function getSessionsSnapshot() {
  if (typeof window === 'undefined') return emptyArray;
  const raw = localStorage.getItem('cfa-buddy-sessions');
  if (!raw) return emptyArray;
  if (raw !== mistakeCachedRaw) {
    mistakeCachedRaw = raw;
    try {
      mistakeCachedParsed = JSON.parse(raw) as typeof emptyArray;
    } catch {
      mistakeCachedParsed = emptyArray;
    }
  }
  return mistakeCachedParsed;
}

function getServerSnapshot() {
  return emptyArray;
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function MistakeBook() {
  const sessions = useSyncExternalStore(subscribe, getSessionsSnapshot, getServerSnapshot);
  const [filter, setFilter] = useState<string>('all');

  const mistakes = useMemo<MistakeEntry[]>(() => {
    const allMistakes: MistakeEntry[] = [];

    for (const session of sessions) {
      for (const attempt of (session.attempts ?? []) as unknown as QuestionAttempt[]) {
        if (!attempt.correct) {
          allMistakes.push({
            attempt,
            questionText: attempt.questionId,
            subject: 'CFA Level I',
            classification: attempt.errorClassification ?? 'Unclassified',
          });
        }
      }
    }

    return allMistakes.reverse();
  }, [sessions]);

  const filteredMistakes = filter === 'all'
    ? mistakes
    : mistakes.filter(m => m.classification === filter);

  const classificationCounts = mistakes.reduce((acc, m) => {
    acc[m.classification] = (acc[m.classification] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const { focusedIndex, listRef } = useListNavigation(filteredMistakes.length);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-red-400">{mistakes.length}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Total Mistakes</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-orange-400">
            {mistakes.filter(m => m.attempt.confidence === 'Certain').length}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Misconceptions</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold text-yellow-400">
            {mistakes.filter(m => m.attempt.confidence === 'Guess').length}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Knowledge Gaps</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground-secondary)' }}>
            {classificationCounts['Unclassified'] ?? 0}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Unclassified</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <MistakeAnalytics mistakes={mistakes} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', ...Object.keys(classificationCounts)].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={filter === f
              ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }
              : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }
            }
          >
            {f === 'all' ? 'All' : f} {f !== 'all' && `(${classificationCounts[f]})`}
          </button>
        ))}
      </div>

      {/* Mistake List */}
      <div ref={listRef} className="space-y-2">
        {filteredMistakes.map((mistake, idx) => (
          <div
            key={idx}
            data-list-item
            className={`rounded-lg border p-4 transition-colors ${
              focusedIndex === idx ? 'ring-1 ring-[#C5A258]/50' : ''
            }`}
            style={{
              borderColor: focusedIndex === idx ? 'var(--accent-secondary)' : 'var(--card-border)',
              background: 'var(--card-bg)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>Question: {mistake.attempt.questionId}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    mistake.attempt.confidence === 'Certain' ? 'bg-red-900/30 text-red-400' :
                    mistake.attempt.confidence === 'ThinkSo' ? 'bg-orange-900/30 text-orange-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {mistake.attempt.confidence}
                  </span>
                  <span className="rounded px-2 py-0.5 text-[10px]" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
                    {mistake.classification}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                    {mistake.attempt.timeSpentSeconds}s
                  </span>
                </div>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                {new Date(mistake.attempt.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {mistakes.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)' }}>
          <p style={{ color: 'var(--foreground-secondary)' }}>No mistakes recorded yet.</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Complete some question sessions to see your error patterns.</p>
        </div>
      )}
    </div>
  );
}
