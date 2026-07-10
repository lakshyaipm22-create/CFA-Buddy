'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { TestMode, SessionConfig, QuestionSession } from '../types';
import { saveSession, getResumableSession } from '../utils/session-storage';
import { loadAllQuestions } from '../utils/question-loader';

const TEST_MODES: Array<{ mode: TestMode; label: string; description: string; defaultCount: number }> = [
  { mode: 'Topic', label: 'Topic Test', description: 'Questions from a specific topic', defaultCount: 20 },
  { mode: 'Subject', label: 'Subject Test', description: 'Questions from an entire subject', defaultCount: 40 },
  { mode: 'Mixed', label: 'Mixed Test', description: 'Questions across all subjects', defaultCount: 90 },
  { mode: 'QuickTopic', label: 'Quick Test', description: '10 quick questions', defaultCount: 10 },
  { mode: 'Random', label: 'Random', description: 'Random selection', defaultCount: 20 },
  { mode: 'Mock', label: 'CFA Mock Exam', description: '90 questions, 135 min, weighted by curriculum', defaultCount: 90 },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

const PROVIDER_LABELS: Record<string, string> = {
  curriculum: 'Curriculum',
  'premium-practice': 'Premium Practice',
};

function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

// Modes that support subject filtering
const SUBJECT_FILTER_MODES: TestMode[] = ['Topic', 'Subject', 'Mixed', 'Random'];

export function SessionConfigurator() {
  const allQuestions = loadAllQuestions();
  const PROVIDERS = [...new Set(allQuestions.map(q => q.provider))];
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<TestMode>('Mixed');
  const [questionCount, setQuestionCount] = useState(20);
  const [timed, setTimed] = useState(false);
  const [timeLimit, setTimeLimit] = useState(90);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set(DIFFICULTIES));
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(() => new Set(PROVIDERS));
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(() => new Set());

  const resumable = typeof window !== 'undefined' ? getResumableSession() : null;

  // Compute per-provider question counts (memoized)
  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of allQuestions) {
      counts[q.provider] = (counts[q.provider] || 0) + 1;
    }
    return counts;
  }, [allQuestions]);

  // Compute unique subjects with counts
  const subjectsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of allQuestions) {
      counts[q.subject] = (counts[q.subject] || 0) + 1;
    }
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [allQuestions]);

  const availableCount = useMemo(() => {
    return allQuestions.filter(q =>
      selectedDifficulties.has(q.difficulty) &&
      selectedProviders.has(q.provider) &&
      (selectedSubjects.size === 0 || selectedSubjects.has(q.subject))
    ).length;
  }, [selectedDifficulties, selectedProviders, selectedSubjects, allQuestions]);

  const toggleDifficulty = (d: string) => {
    const next = new Set(selectedDifficulties);
    if (next.has(d)) { if (next.size > 1) next.delete(d); }
    else next.add(d);
    setSelectedDifficulties(next);
  };

  const toggleProvider = (p: string) => {
    const next = new Set(selectedProviders);
    if (next.has(p)) { if (next.size > 1) next.delete(p); }
    else next.add(p);
    setSelectedProviders(next);
  };

  const toggleSubject = (s: string) => {
    const next = new Set(selectedSubjects);
    if (next.has(s)) {
      next.delete(s);
    } else {
      next.add(s);
    }
    setSelectedSubjects(next);
  };

  const handleModeSelect = (mode: TestMode, defaultCount: number) => {
    setSelectedMode(mode);
    setQuestionCount(defaultCount);
    if (mode === 'Mock') {
      setTimed(true);
      setTimeLimit(135);
    }
  };

  const startSession = () => {
    const config: SessionConfig = {
      questionCount: Math.min(questionCount, availableCount),
      timeLimit: timed ? timeLimit : null,
      difficulty: selectedDifficulties.size < DIFFICULTIES.length ? [...selectedDifficulties].join(',') : undefined,
      provider: selectedProviders.size < PROVIDERS.length ? [...selectedProviders].join(',') : undefined,
      subject: selectedSubjects.size > 0 ? [...selectedSubjects].join(',') : undefined,
    };

    const session: QuestionSession = {
      id: crypto.randomUUID(),
      mode: selectedMode,
      config,
      status: 'active',
      startedAt: new Date().toISOString(),
      completedAt: null,
      questionIds: [],
      attempts: [],
      currentIndex: 0,
      flaggedIds: [],
      bookmarkedIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    saveSession(session);
    router.push(`/questions/session/${session.id}`);
  };

  const showSubjectFilter = SUBJECT_FILTER_MODES.includes(selectedMode);

  return (
    <div className="space-y-6">
      {/* Resume prompt */}
      {resumable && (
        <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4">
          <p className="text-sm text-yellow-300">You have an incomplete session</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
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
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>Test Mode</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {TEST_MODES.map(({ mode, label, description, defaultCount }) => (
            <button
              key={mode}
              onClick={() => handleModeSelect(mode, defaultCount)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selectedMode === mode ? 'border-blue-500 bg-blue-950/30' : 'hover:opacity-80'
              }`}
              style={selectedMode === mode ? undefined : { borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Difficulty Filter */}
        <div>
          <h3 className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Difficulty</h3>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => toggleDifficulty(d)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={selectedDifficulties.has(d)
                  ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }
                  : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Provider Filter */}
        <div>
          <h3 className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Provider</h3>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map(p => {
              const count = providerCounts[p] || 0;
              return (
                <button
                  key={p}
                  onClick={() => toggleProvider(p)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={selectedProviders.has(p)
                    ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }
                    : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }
                  }
                >
                  {getProviderLabel(p)} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject Filter - shown for applicable modes */}
      {showSubjectFilter && subjectsWithCounts.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            Subjects {selectedSubjects.size > 0 && `(${selectedSubjects.size} selected)`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {subjectsWithCounts.map(([subject, count]) => (
              <button
                key={subject}
                onClick={() => toggleSubject(subject)}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={selectedSubjects.has(subject)
                  ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }
                  : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }
                }
              >
                {subject} ({count})
              </button>
            ))}
          </div>
          {selectedSubjects.size === 0 && (
            <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              No filter applied - all subjects included
            </p>
          )}
        </div>
      )}

      {/* Configuration */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Questions</label>
          <input
            type="number"
            min={5}
            max={Math.min(180, availableCount)}
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.max(5, Math.min(availableCount, parseInt(e.target.value) || 5)))}
            className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {availableCount} questions available with current filters
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => setTimed(e.target.checked)}
              className="rounded"
              style={{ borderColor: 'var(--card-border)' }}
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
                className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Minutes (5-270)</p>
            </div>
          )}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startSession}
        disabled={availableCount === 0}
        className="w-full rounded-lg px-6 py-3 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 md:w-auto"
        style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
      >
        Start {selectedMode} Test ({Math.min(questionCount, availableCount)} questions{timed ? `, ${timeLimit} min` : ', untimed'})
      </button>
      {availableCount === 0 && (
        <p className="text-sm" style={{ color: '#ef4444' }}>
          No questions match your filters. Try broadening your selection.
        </p>
      )}
    </div>
  );
}
