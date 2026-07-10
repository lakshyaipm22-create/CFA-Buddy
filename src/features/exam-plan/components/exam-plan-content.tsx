'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';
import { Calendar, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';

// CFA Level I subjects with weights (in curriculum order)
const SUBJECTS = CFA_SUBJECTS_ORDERED.map((name, idx) => {
  const weights = [10, 10, 8, 13, 11, 11, 6, 6, 10, 15];
  return { name, weight: weights[idx] };
});

// Module-level cache for exam date
let examDateCachedRaw: string | null = '___init___';
let examDateCachedVal: string | null = null;

function getExamDateSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cfa-buddy-exam-date');
  if (raw !== examDateCachedRaw) {
    examDateCachedRaw = raw;
    examDateCachedVal = raw;
  }
  return examDateCachedVal;
}

function getExamDateServer(): string | null {
  return null;
}

function subscribeStorage(cb: () => void) {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

interface SessionData {
  status: string;
  attempts?: Array<{
    correct: boolean;
    questionId?: string;
    confidence?: string;
  }>;
}

const emptySessions: SessionData[] = [];
let sessionsCachedRaw: string | null = null;
let sessionsCachedVal: SessionData[] = emptySessions;

function getSessionsSnapshot(): SessionData[] {
  if (typeof window === 'undefined') return emptySessions;
  const raw = localStorage.getItem('cfa-buddy-sessions');
  if (!raw) return emptySessions;
  if (raw !== sessionsCachedRaw) {
    sessionsCachedRaw = raw;
    try { sessionsCachedVal = JSON.parse(raw); } catch { sessionsCachedVal = emptySessions; }
  }
  return sessionsCachedVal;
}

function getSessionsServer(): SessionData[] {
  return emptySessions;
}

export function ExamPlanContent() {
  const examDate = useSyncExternalStore(subscribeStorage, getExamDateSnapshot, getExamDateServer);
  const sessions = useSyncExternalStore(subscribeStorage, getSessionsSnapshot, getSessionsServer);
  const [inputDate, setInputDate] = useState('');

  const saveDate = () => {
    if (!inputDate) return;
    localStorage.setItem('cfa-buddy-exam-date', inputDate);
    window.dispatchEvent(new StorageEvent('storage', { key: 'cfa-buddy-exam-date' }));
    setInputDate('');
  };

  const metrics = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    const target = new Date(examDate);
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
    const totalTopics = 80; // Approximate CFA L1 topics
    const topicsPerDay = daysLeft > 0 ? Math.ceil(totalTopics / daysLeft) : totalTopics;
    const questionsPerDay = daysLeft > 0 ? Math.ceil(2000 / daysLeft) : 50; // Target 2000 questions total

    const completed = sessions.filter(s => s.status === 'completed');
    const totalAnswered = completed.reduce((sum, s) => sum + (s.attempts?.length ?? 0), 0);
    const dailyTarget = questionsPerDay;
    const progressPct = Math.min(100, Math.round((totalAnswered / 2000) * 100));

    // Pacing
    const daysElapsed = Math.max(1, 90 - daysLeft); // Assume 90 day plan
    const expectedProgress = (daysElapsed / 90) * 100;
    const pacing = progressPct >= expectedProgress * 1.1 ? 'ahead' :
                   progressPct >= expectedProgress * 0.9 ? 'on-track' : 'behind';

    return { daysLeft, topicsPerDay, questionsPerDay: dailyTarget, progressPct, pacing, totalAnswered };
  }, [examDate, sessions]);

  // Subject progress from attempts
  const subjectProgress = useMemo(() => {
    const completed = sessions.filter(s => s.status === 'completed');
    const bySubject: Record<string, { correct: number; total: number }> = {};

    for (const session of completed) {
      for (const attempt of session.attempts ?? []) {
        // Since we don't have subject info per attempt in localStorage, distribute evenly
        const subjectName = 'All Subjects';
        if (!bySubject[subjectName]) bySubject[subjectName] = { correct: 0, total: 0 };
        bySubject[subjectName].total++;
        if (attempt.correct) bySubject[subjectName].correct++;
      }
    }
    return bySubject;
  }, [sessions]);

  if (!examDate) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <Calendar className="mx-auto h-12 w-12 opacity-40" style={{ color: 'var(--foreground-secondary)' }} />
        <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Set Your Exam Date</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Set your target exam date to get personalized pacing recommendations.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--background-tertiary)', color: 'var(--foreground)' }}
          />
          <button
            onClick={saveDate}
            disabled={!inputDate}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            Set Date
          </button>
        </div>
      </div>
    );
  }

  const pacingColor = metrics?.pacing === 'ahead' ? '#00843D' : metrics?.pacing === 'on-track' ? '#C5A258' : '#ef4444';
  const pacingLabel = metrics?.pacing === 'ahead' ? 'Ahead of Schedule' : metrics?.pacing === 'on-track' ? 'On Track' : 'Behind Schedule';

  return (
    <div className="space-y-6">
      {/* Countdown + Pacing */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <Calendar className="mx-auto h-6 w-6" style={{ color: 'var(--accent-secondary)' }} />
          <p className="mt-3 text-4xl font-bold" style={{ color: 'var(--accent-secondary)' }}>{metrics?.daysLeft}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Days Until Exam</p>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <TrendingUp className="mx-auto h-6 w-6" style={{ color: pacingColor }} />
          <p className="mt-3 text-lg font-bold" style={{ color: pacingColor }}>{pacingLabel}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>{metrics?.progressPct}% of target complete</p>
        </div>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <Target className="mx-auto h-6 w-6" style={{ color: 'var(--foreground-secondary)' }} />
          <p className="mt-3 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{metrics?.questionsPerDay}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Questions/Day Target</p>
        </div>
      </div>

      {/* Daily Targets */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Daily Study Targets</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border p-4" style={{ borderColor: 'var(--card-border)' }}>
            <CheckCircle2 className="h-5 w-5 text-[#00843D]" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{metrics?.questionsPerDay} questions/day</p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>To reach 2,000 questions by exam day</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4" style={{ borderColor: 'var(--card-border)' }}>
            <CheckCircle2 className="h-5 w-5 text-[#002B5C]" />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{metrics?.topicsPerDay} topics/day</p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>To cover all 80 topics before exam</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Subject Progress</h3>
        <div className="mt-4 space-y-3">
          {SUBJECTS.map(subject => {
            const progress = subjectProgress[subject.name];
            const accuracy = progress ? Math.round((progress.correct / progress.total) * 100) : 0;
            const coverage = Math.min(100, (progress?.total ?? 0) * 2); // rough estimate

            return (
              <div key={subject.name} className="flex items-center gap-3">
                <p className="w-48 truncate text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {subject.name}
                </p>
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${coverage}%`, background: coverage > 70 ? '#00843D' : coverage > 30 ? '#C5A258' : '#002B5C' }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {accuracy > 0 ? `${accuracy}%` : '--'}
                </span>
                <span className="w-10 text-right text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                  ({subject.weight}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
