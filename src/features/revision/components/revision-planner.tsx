'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, RotateCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { useLocalStorageSessions } from '@/features/dashboard/hooks/use-local-storage-sessions';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { sortByCfaOrder } from '@/shared/config/subjects';

// Spaced repetition intervals (days)
const REVISION_INTERVALS = [0, 3, 7, 15, 30];

interface SubjectRevision {
  subject: string;
  accuracy: number;
  total: number;
  lastStudied: string | null;
  daysSinceLastStudy: number;
  priority: number; // higher = needs more revision
  nextRevisionDate: string;
  revisionStage: number; // 0-4 index into REVISION_INTERVALS
}

const STORAGE_KEY = 'cfa-buddy-revision-schedule';

function getRevisionSchedule(): Record<string, { stage: number; lastRevised: string }> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
}

function saveRevisionSchedule(schedule: Record<string, { stage: number; lastRevised: string }>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

export function RevisionPlanner() {
  const sessions = useLocalStorageSessions();
  const [schedule, setSchedule] = useState(() => getRevisionSchedule());

  const allQuestions = useMemo(() => loadAllQuestions(), []);
  const ALL_SUBJECTS = useMemo(() => sortByCfaOrder([...new Set(allQuestions.map(q => q.subject))]), [allQuestions]);

  const subjectData = useMemo<SubjectRevision[]>(() => {
    const completed = sessions.filter(s => s.status === 'completed');
    const now = new Date();

    return ALL_SUBJECTS.map(subject => {
      let correct = 0, total = 0;
      let lastTimestamp: string | null = null;

      for (const session of completed) {
        for (const attempt of session.attempts ?? []) {
          // Match subject by question ID prefix
          const q = allQuestions.find(sq => sq.id === attempt.questionId);
          if (q?.subject === subject) {
            total++;
            if (attempt.correct) correct++;
            if (!lastTimestamp || (attempt.timestamp && attempt.timestamp > lastTimestamp)) {
              lastTimestamp = attempt.timestamp ?? null;
            }
          }
        }
      }

      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const daysSince = lastTimestamp
        ? Math.floor((now.getTime() - new Date(lastTimestamp).getTime()) / 86400000)
        : 999;

      const sched = schedule[subject];
      const stage = sched?.stage ?? 0;
      const nextInterval = REVISION_INTERVALS[Math.min(stage, REVISION_INTERVALS.length - 1)];
      const lastRevised = sched?.lastRevised ?? lastTimestamp;
      const nextDate = lastRevised
        ? new Date(new Date(lastRevised).getTime() + nextInterval * 86400000)
        : now;

      // Priority: lower accuracy + more days since study = higher priority
      const priority = (100 - accuracy) + daysSince * 2 + (stage === 0 ? 50 : 0);

      return {
        subject,
        accuracy,
        total,
        lastStudied: lastTimestamp,
        daysSinceLastStudy: daysSince,
        priority,
        nextRevisionDate: nextDate.toISOString().slice(0, 10),
        revisionStage: stage,
      };
    }).sort((a, b) => b.priority - a.priority);
  }, [sessions, schedule, allQuestions, ALL_SUBJECTS]);

  const markRevised = (subject: string) => {
    const current = schedule[subject];
    const newStage = Math.min((current?.stage ?? 0) + 1, REVISION_INTERVALS.length - 1);
    const updated = { ...schedule, [subject]: { stage: newStage, lastRevised: new Date().toISOString() } };
    setSchedule(updated);
    saveRevisionSchedule(updated);
  };

  const dueToday = subjectData.filter(s => s.nextRevisionDate <= new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <AlertTriangle className="mx-auto h-5 w-5 text-[#C5A258]" />
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{dueToday.length}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Due Today</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <RotateCw className="mx-auto h-5 w-5 text-[#002B5C]" />
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{ALL_SUBJECTS.length}</p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Total Subjects</p>
        </div>
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <TrendingUp className="mx-auto h-5 w-5 text-[#00843D]" />
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            {subjectData.filter(s => s.revisionStage >= 3).length}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Well Revised</p>
        </div>
      </div>

      {/* Revision Schedule */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Revision Priority</h3>
        <div className="space-y-3">
          {subjectData.map(s => {
            const isDue = s.nextRevisionDate <= new Date().toISOString().slice(0, 10);
            return (
              <div
                key={s.subject}
                className="flex items-center gap-4 rounded-lg border p-3"
                style={{ borderColor: isDue ? 'var(--accent-secondary)' : 'var(--card-border)', background: isDue ? 'rgba(197,162,88,0.03)' : 'transparent' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{s.subject}</p>
                    {isDue && <span className="text-[9px] rounded px-1.5 py-0.5 bg-[#C5A258] text-white font-medium">DUE</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                      Accuracy: {s.accuracy > 0 ? `${s.accuracy}%` : '--'}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                      Stage: {s.revisionStage + 1}/5
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                      Next: {s.nextRevisionDate}
                    </span>
                  </div>
                </div>
                {/* Progress dots */}
                <div className="flex gap-1">
                  {REVISION_INTERVALS.map((_, i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full"
                      style={{ background: i <= s.revisionStage ? '#00843D' : 'var(--nav-hover-bg)' }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => markRevised(s.subject)}
                    className="rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors hover:opacity-90"
                    style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
                  >
                    Mark Revised
                  </button>
                  <Link
                    href="/questions"
                    className="rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors hover:opacity-90"
                    style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground)' }}
                  >
                    Practice
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Preview */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Upcoming Revisions (7 days)</h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);
            const due = subjectData.filter(s => s.nextRevisionDate === dateStr);
            return (
              <div key={i} className="text-center rounded-lg border p-2" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className="text-xs font-bold mt-1" style={{ color: due.length > 0 ? 'var(--accent-secondary)' : 'var(--foreground-secondary)' }}>
                  {due.length > 0 ? due.length : '-'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
