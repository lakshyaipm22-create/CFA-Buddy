'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, RotateCw, AlertTriangle, Zap } from 'lucide-react';
import { sortByCfaOrder } from '@/shared/config/subjects';
import type { TestMode, SessionConfig, QuestionSession } from '../types';
import { saveSession, getResumableSession, getAllSessions } from '../utils/session-storage';
import { loadAllQuestions } from '../utils/question-loader';

// CFA Level I curriculum weights for mock exam
const CFA_WEIGHTS: Record<string, { min: number; max: number }> = {
  'Ethical and Professional Standards': { min: 15, max: 20 },
  'Quantitative Methods': { min: 6, max: 9 },
  'Economics': { min: 6, max: 9 },
  'Financial Statement Analysis': { min: 11, max: 14 },
  'Corporate Issuers': { min: 6, max: 9 },
  'Equity Investments': { min: 11, max: 14 },
  'Fixed Income': { min: 11, max: 14 },
  'Derivatives': { min: 5, max: 8 },
  'Alternative Investments': { min: 5, max: 8 },
  'Portfolio Management': { min: 8, max: 12 },
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

type ConfigMode = 'custom' | 'mock' | 'retest' | 'weak';

export function SessionConfigurator() {
  const allQuestions = loadAllQuestions();
  const SUBJECTS = sortByCfaOrder([...new Set(allQuestions.map(q => q.subject))]);
  const PROVIDERS = [...new Set(allQuestions.map(q => q.provider))];
  const router = useRouter();

  const [configMode, setConfigMode] = useState<ConfigMode>('custom');
  const [questionCount, setQuestionCount] = useState(20);
  const [timed, setTimed] = useState(false);
  const [timeLimit, setTimeLimit] = useState(90);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set(DIFFICULTIES));
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(() => new Set(PROVIDERS));
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(() => new Set(SUBJECTS));

  const resumable = typeof window !== 'undefined' ? getResumableSession() : null;

  // Count questions per subject
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of allQuestions) {
      counts[q.subject] = (counts[q.subject] ?? 0) + 1;
    }
    return counts;
  }, [allQuestions]);

  // Get wrong question IDs for Adaptive Retest
  const wrongQuestionIds = useMemo(() => {
    if (typeof window === 'undefined') return new Set<string>();
    const sessions = getAllSessions().filter(s => s.status === 'completed');
    const wrong = new Set<string>();
    for (const s of sessions) {
      for (const a of s.attempts) {
        if (!a.correct) wrong.add(a.questionId);
      }
    }
    return wrong;
  }, []);

  // Get weak subjects (< 60% accuracy)
  const weakSubjects = useMemo(() => {
    if (typeof window === 'undefined') return [] as Array<{ subject: string; accuracy: number }>;
    const sessions = getAllSessions().filter(s => s.status === 'completed');
    const bySubject: Record<string, { correct: number; total: number }> = {};
    for (const s of sessions) {
      for (const a of s.attempts) {
        const q = allQuestions.find(qq => qq.id === a.questionId);
        if (!q) continue;
        if (!bySubject[q.subject]) bySubject[q.subject] = { correct: 0, total: 0 };
        bySubject[q.subject].total++;
        if (a.correct) bySubject[q.subject].correct++;
      }
    }
    return Object.entries(bySubject)
      .filter(([, v]) => v.total >= 3 && (v.correct / v.total) < 0.6)
      .map(([subject, v]) => ({ subject, accuracy: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [allQuestions]);

  const availableCount = useMemo(() => {
    if (configMode === 'mock') return Math.min(90, allQuestions.length);
    if (configMode === 'retest') return Math.min(wrongQuestionIds.size, allQuestions.filter(q => wrongQuestionIds.has(q.id)).length);
    if (configMode === 'weak') {
      const weakSubs = new Set(weakSubjects.map(w => w.subject));
      return allQuestions.filter(q => weakSubs.has(q.subject)).length;
    }
    return allQuestions.filter(q =>
      selectedDifficulties.has(q.difficulty) &&
      selectedProviders.has(q.provider) &&
      selectedSubjects.has(q.subject)
    ).length;
  }, [configMode, selectedDifficulties, selectedProviders, selectedSubjects, allQuestions, wrongQuestionIds, weakSubjects]);

  const toggleSubject = (s: string) => {
    if (selectedSubjects.size === SUBJECTS.length || !selectedSubjects.has(s)) {
      // If all are selected or clicking a different one: select ONLY this subject
      setSelectedSubjects(new Set([s]));
    } else if (selectedSubjects.has(s) && selectedSubjects.size === 1) {
      // If clicking the already-selected single subject: reset to ALL
      setSelectedSubjects(new Set(SUBJECTS));
    } else {
      // Otherwise: select only this one
      setSelectedSubjects(new Set([s]));
    }
  };

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

  const startSession = () => {
    let mode: TestMode = 'Mixed';
    let count = Math.min(questionCount, availableCount);
    let timedMode = timed;
    let timeLimitVal = timeLimit;

    if (configMode === 'mock') {
      mode = 'Mixed';
      count = 90;
      timedMode = true;
      timeLimitVal = 135;
    } else if (configMode === 'retest') {
      mode = 'AdaptiveRetest';
      count = Math.min(30, wrongQuestionIds.size);
    } else if (configMode === 'weak') {
      mode = 'WeakTopic';
      count = Math.min(30, availableCount);
    }

    const config: SessionConfig = {
      questionCount: count,
      timeLimit: timedMode ? timeLimitVal : null,
      difficulty: configMode === 'custom' && selectedDifficulties.size < DIFFICULTIES.length ? [...selectedDifficulties].join(',') : undefined,
      provider: configMode === 'custom' && selectedProviders.size < PROVIDERS.length ? [...selectedProviders].join(',') : undefined,
      subject: configMode === 'custom' && selectedSubjects.size < SUBJECTS.length ? [...selectedSubjects].join(',') : undefined,
    };

    const session: QuestionSession = {
      id: crypto.randomUUID(),
      mode,
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

  return (
    <div className="space-y-6">
      {/* Resume prompt */}
      {resumable && (
        <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4">
          <p className="text-sm text-yellow-300">You have an incomplete session</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {resumable.attempts.length}/{resumable.questionIds.length} answered • Started {new Date(resumable.startedAt).toLocaleDateString()}
          </p>
          <button
            onClick={() => router.push(`/questions/session/${resumable.id}`)}
            className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500"
          >
            Resume Session
          </button>
        </div>
      )}

      {/* Quick Start Presets */}
      <div>
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>Quick Start</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PresetCard
            icon={<Trophy className="h-5 w-5" />}
            title="Mock CFA Exam"
            desc="90 questions, 135 min, weighted by curriculum"
            active={configMode === 'mock'}
            onClick={() => setConfigMode('mock')}
            badge={`${Math.min(90, allQuestions.length)} Qs`}
          />
          <PresetCard
            icon={<RotateCw className="h-5 w-5" />}
            title="Retest Wrong"
            desc="Practice questions you previously got wrong"
            active={configMode === 'retest'}
            onClick={() => setConfigMode('retest')}
            badge={`${wrongQuestionIds.size} Qs`}
            disabled={wrongQuestionIds.size === 0}
          />
          <PresetCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Weak Topics"
            desc={weakSubjects.length > 0 ? `Focus on ${weakSubjects[0]?.subject.split(' ').slice(0, 2).join(' ')} (${weakSubjects[0]?.accuracy}%)` : 'Complete sessions to identify'}
            active={configMode === 'weak'}
            onClick={() => setConfigMode('weak')}
            badge={weakSubjects.length > 0 ? `${weakSubjects.length} weak` : '--'}
            disabled={weakSubjects.length === 0}
          />
          <PresetCard
            icon={<Zap className="h-5 w-5" />}
            title="Custom Test"
            desc="Choose subjects, difficulty, count"
            active={configMode === 'custom'}
            onClick={() => setConfigMode('custom')}
            badge={`${availableCount} Qs`}
          />
        </div>
      </div>

      {/* Custom mode options */}
      {configMode === 'custom' && (
        <>
          {/* Subject filter with counts */}
          <div>
            <h3 className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Subjects (click one to filter, click again for all)</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubjects(new Set(SUBJECTS))}
                className="rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                style={selectedSubjects.size === SUBJECTS.length
                  ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }
                  : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }
                }
              >
                All ({allQuestions.length})
              </button>
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className="rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                  style={selectedSubjects.has(s) && selectedSubjects.size < SUBJECTS.length
                    ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }
                    : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }
                  }
                >
                  {s.split(' ').slice(0, 2).join(' ')} ({subjectCounts[s] ?? 0})
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty + Provider */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Difficulty</h3>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => toggleDifficulty(d)} className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors" style={selectedDifficulties.has(d) ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' } : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>Provider</h3>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map(p => (
                  <button key={p} onClick={() => toggleProvider(p)} className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize" style={selectedProviders.has(p) ? { background: 'var(--accent-primary)', color: 'var(--accent-secondary)' } : { background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Count + Timer */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Questions</label>
              <input
                type="number" min={5} max={Math.min(180, availableCount)} value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(5, Math.min(availableCount, parseInt(e.target.value) || 5)))}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>{availableCount} available</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="rounded" />
                Timed Mode
              </label>
              {timed && (
                <input type="number" min={5} max={270} value={timeLimit} onChange={(e) => setTimeLimit(Math.max(5, Math.min(270, parseInt(e.target.value) || 90)))}
                  className="mt-2 w-full rounded-lg border px-3 py-2 focus:outline-none" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }} />
              )}
            </div>
          </div>
        </>
      )}

      {/* Mock exam info */}
      {configMode === 'mock' && (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>CFA Exam Simulation</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            90 questions · 135 minutes · Weighted by CFA curriculum · Timed mode (no instant feedback)
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
            {Object.entries(CFA_WEIGHTS).slice(0, 5).map(([subject, { min, max }]) => (
              <div key={subject} className="text-center">
                <p className="text-[9px] truncate" style={{ color: 'var(--foreground-secondary)' }}>{subject.split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{min}-{max}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={startSession}
        disabled={availableCount === 0}
        className="w-full rounded-lg px-6 py-3.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 md:w-auto"
        style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
      >
        {configMode === 'mock' ? 'Start Mock Exam (90 Qs, 135 min)' :
         configMode === 'retest' ? `Retest ${Math.min(30, wrongQuestionIds.size)} Wrong Questions` :
         configMode === 'weak' ? `Practice Weak Topics (${Math.min(30, availableCount)} Qs)` :
         `Start Test (${Math.min(questionCount, availableCount)} questions${timed ? `, ${timeLimit} min` : ''})`}
      </button>
    </div>
  );
}

function PresetCard({ icon, title, desc, active, onClick, badge, disabled }: {
  icon: React.ReactNode; title: string; desc: string; active: boolean; onClick: () => void; badge: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/30' : 'hover:opacity-80'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      style={active ? undefined : { borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex items-start justify-between">
        <span style={{ color: active ? '#60a5fa' : 'var(--foreground-secondary)' }}>{icon}</span>
        <span className="text-[10px] rounded px-1.5 py-0.5 font-medium" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>{badge}</span>
      </div>
      <p className="mt-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{title}</p>
      <p className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--foreground-secondary)' }}>{desc}</p>
    </button>
  );
}
