'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TestMode, SessionConfig, QuestionSession } from '../types';
import { saveSession, getResumableSession } from '../utils/session-storage';

const TEST_MODES: Array<{ mode: TestMode; label: string; description: string; defaultCount: number }> = [
  { mode: 'Topic', label: 'Topic Test', description: 'Questions from a specific topic', defaultCount: 20 },
  { mode: 'Subject', label: 'Subject Test', description: 'Questions from an entire subject', defaultCount: 40 },
  { mode: 'Mixed', label: 'Mixed Test', description: 'Questions across all subjects', defaultCount: 90 },
  { mode: 'QuickTopic', label: 'Quick Test', description: '10 quick questions', defaultCount: 10 },
  { mode: 'Random', label: 'Random', description: 'Random selection', defaultCount: 20 },
];

export function SessionConfigurator() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<TestMode>('Mixed');
  const [questionCount, setQuestionCount] = useState(20);
  const [timed, setTimed] = useState(false);
  const [timeLimit, setTimeLimit] = useState(90);

  const resumable = typeof window !== 'undefined' ? getResumableSession() : null;

  const startSession = () => {
    const config: SessionConfig = {
      questionCount,
      timeLimit: timed ? timeLimit : null,
    };

    const session: QuestionSession = {
      id: crypto.randomUUID(),
      mode: selectedMode,
      config,
      status: 'active',
      startedAt: new Date().toISOString(),
      completedAt: null,
      questionIds: [], // Will be populated when questions are loaded
      attempts: [],
      currentIndex: 0,
      flaggedIds: [],
      bookmarkedIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    saveSession(session);
    router.push(`/questions/session/${session.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Resume prompt */}
      {resumable && (
        <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4">
          <p className="text-sm text-yellow-300">You have an incomplete session</p>
          <p className="mt-1 text-xs text-zinc-400">
            {resumable.attempts.length}/{resumable.questionIds.length} questions answered • Started {new Date(resumable.startedAt).toLocaleDateString()}
          </p>
          <button
            onClick={() => router.push(`/questions/session/${resumable.id}`)}
            className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500"
          >
            Resume Session
          </button>
        </div>
      )}

      {/* Mode selection */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Test Mode</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {TEST_MODES.map(({ mode, label, description, defaultCount }) => (
            <button
              key={mode}
              onClick={() => { setSelectedMode(mode); setQuestionCount(defaultCount); }}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selectedMode === mode
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
              }`}
            >
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="mt-1 text-xs text-zinc-400">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Questions</label>
          <input
            type="number"
            min={5}
            max={180}
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.max(5, Math.min(180, parseInt(e.target.value) || 5)))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-600">Min 5, max 180</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => setTimed(e.target.checked)}
              className="rounded border-zinc-700"
            />
            Timed Mode
          </label>
          {timed && (
            <div className="mt-2">
              <input
                type="number"
                min={5}
                max={270}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Math.max(5, Math.min(270, parseInt(e.target.value) || 90)))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-600">Minutes (5-270)</p>
            </div>
          )}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startSession}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 md:w-auto"
      >
        Start {selectedMode} Test ({questionCount} questions{timed ? `, ${timeLimit} min` : ', untimed'})
      </button>

      <p className="text-xs text-zinc-600">
        Note: Questions will be available after running the Question Import Pipeline.
        Currently showing configuration UI only.
      </p>
    </div>
  );
}
