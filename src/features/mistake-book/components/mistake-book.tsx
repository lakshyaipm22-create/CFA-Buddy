'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';
import type { QuestionAttempt } from '@/features/question-bank/types';

interface MistakeEntry {
  attempt: QuestionAttempt;
  questionText: string;
  subject: string;
  classification: string;
}

const emptyArray: Array<{ status: string; attempts?: Array<Record<string, unknown>> }> = [];

function getSessionsSnapshot() {
  if (typeof window === 'undefined') return emptyArray;
  const raw = localStorage.getItem('cfa-buddy-sessions');
  if (!raw) return emptyArray;
  try {
    return JSON.parse(raw) as typeof emptyArray;
  } catch {
    return emptyArray;
  }
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{mistakes.length}</p>
          <p className="text-xs text-zinc-500">Total Mistakes</p>
        </div>
        <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">
            {mistakes.filter(m => m.attempt.confidence === 'Certain').length}
          </p>
          <p className="text-xs text-zinc-500">Misconceptions</p>
        </div>
        <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {mistakes.filter(m => m.attempt.confidence === 'Guess').length}
          </p>
          <p className="text-xs text-zinc-500">Knowledge Gaps</p>
        </div>
        <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-4 text-center">
          <p className="text-2xl font-bold text-zinc-400">
            {classificationCounts['Unclassified'] ?? 0}
          </p>
          <p className="text-xs text-zinc-500">Unclassified</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', ...Object.keys(classificationCounts)].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-[#002B5C] text-[#C5A258]' : 'bg-[#1a2332] text-zinc-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f} {f !== 'all' && `(${classificationCounts[f]})`}
          </button>
        ))}
      </div>

      {/* Mistake List */}
      <div className="space-y-2">
        {filteredMistakes.map((mistake, idx) => (
          <div key={idx} className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-zinc-300">Question: {mistake.attempt.questionId}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    mistake.attempt.confidence === 'Certain' ? 'bg-red-900/30 text-red-400' :
                    mistake.attempt.confidence === 'ThinkSo' ? 'bg-orange-900/30 text-orange-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {mistake.attempt.confidence}
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                    {mistake.classification}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {mistake.attempt.timeSpentSeconds}s
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-zinc-600">
                {new Date(mistake.attempt.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {mistakes.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#1a2332] p-12 text-center">
          <p className="text-zinc-400">No mistakes recorded yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Complete some question sessions to see your error patterns.</p>
        </div>
      )}
    </div>
  );
}
