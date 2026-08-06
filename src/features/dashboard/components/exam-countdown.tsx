'use client';

import { useState, useMemo } from 'react';
import { CFA_SUBJECTS_ORDERED } from '@/shared/config/subjects';

// Total topics in CFA Level I curriculum (approximate)
const TOTAL_CFA_TOPICS = 50;

// NOTE: This component uses useState lazy initializer for localStorage reads instead
// of useSyncExternalStore. This means the component will not react to localStorage
// changes made in other browser tabs. This is intentional per the project's React
// rules (never use useSyncExternalStore for one-time localStorage reads). Cross-tab
// sync is not required for exam date display - a page refresh picks up any changes.

export function ExamCountdown() {
  const [targetDate] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cfa-buddy-exam-date');
  });
  const [inputDate, setInputDate] = useState('');
  const [savedDate, setSavedDate] = useState<string | null>(targetDate);

  const [sessions] = useState<Array<{ status: string; config?: { subject?: string; topic?: string } }>>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('cfa-buddy-sessions');
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Array<{ status: string; config?: { subject?: string; topic?: string } }>;
    } catch {
      return [];
    }
  });

  const saveDate = () => {
    if (!inputDate) return;
    localStorage.setItem('cfa-buddy-exam-date', inputDate);
    setSavedDate(inputDate);
    setInputDate('');
    window.dispatchEvent(new StorageEvent('storage', { key: 'cfa-buddy-exam-date' }));
  };

  const effectiveDate = savedDate;

  const pacing = useMemo(() => {
    if (!effectiveDate) return null;

    const now = new Date();
    const exam = new Date(effectiveDate);
    const daysRemaining = Math.ceil(
      (exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count unique topics studied from completed sessions
    const topicsStudied = new Set<string>();
    const subjectsStudied = new Set<string>();
    for (const session of sessions) {
      if (session.status === 'completed') {
        if (session.config?.topic) {
          topicsStudied.add(session.config.topic);
        }
        if (session.config?.subject) {
          const subjects = session.config.subject.split(',').map((s) => s.trim());
          for (const s of subjects) {
            subjectsStudied.add(s);
          }
        }
      }
    }

    const topicsCovered = Math.max(topicsStudied.size, subjectsStudied.size);
    const topicsRemaining = Math.max(0, TOTAL_CFA_TOPICS - topicsCovered);

    // Topics per day needed
    const topicsPerDay =
      daysRemaining > 0 ? (topicsRemaining / daysRemaining) : 0;

    // Expected progress rate: linear from start to exam date
    // Assume study started 180 days before exam (or actual time if less)
    const totalStudyDays = Math.max(daysRemaining + 30, 180); // estimate total study window
    const daysPassed = totalStudyDays - daysRemaining;
    const expectedProgress = daysPassed > 0
      ? Math.round((daysPassed / totalStudyDays) * TOTAL_CFA_TOPICS)
      : 0;

    // Pace indicator
    let paceStatus: 'ahead' | 'on-track' | 'behind';
    if (topicsCovered >= expectedProgress + 3) {
      paceStatus = 'ahead';
    } else if (topicsCovered >= expectedProgress - 3) {
      paceStatus = 'on-track';
    } else {
      paceStatus = 'behind';
    }

    return {
      daysRemaining,
      topicsPerDay: Math.round(topicsPerDay * 10) / 10,
      topicsCovered,
      topicsRemaining,
      totalTopics: TOTAL_CFA_TOPICS,
      totalSubjects: CFA_SUBJECTS_ORDERED.length,
      subjectsCovered: subjectsStudied.size,
      paceStatus,
    };
  }, [effectiveDate, sessions]);

  if (!effectiveDate) {
    return (
      <div
        className="rounded-lg border border-dashed p-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Exam Countdown
        </h3>
        <p
          className="mt-1 text-xs"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          Set your exam date to see countdown and pacing.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--background-tertiary)',
              color: 'var(--foreground)',
            }}
          />
          <button
            onClick={saveDate}
            disabled={!inputDate}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--accent-secondary)',
            }}
          >
            Set Date
          </button>
        </div>
      </div>
    );
  }

  if (!pacing) return null;

  const isUrgent = pacing.daysRemaining <= 30;
  const paceColors = {
    ahead: { bg: 'rgba(0, 132, 61, 0.1)', text: '#00843D', label: 'Ahead of Schedule' },
    'on-track': { bg: 'rgba(197, 162, 88, 0.1)', text: '#C5A258', label: 'On Track' },
    behind: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: 'Behind Schedule' },
  };
  const pace = paceColors[pacing.paceStatus];

  return (
    <div
      className={`rounded-lg border p-6 ${isUrgent ? 'border-red-900/50 bg-red-950/10' : ''}`}
      style={
        isUrgent
          ? undefined
          : { borderColor: 'var(--card-border)', background: 'var(--card-bg)' }
      }
    >
      {/* Top Row: Countdown + Pace Indicator */}
      <div className="flex items-start justify-between">
        <div>
          <h3
            className="text-sm font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            Exam Countdown
          </h3>
          <p
            className="mt-1 text-xs"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            {new Date(effectiveDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-4xl font-bold ${isUrgent ? 'text-red-400' : ''}`}
            style={isUrgent ? undefined : { color: 'var(--accent-secondary)' }}
          >
            {pacing.daysRemaining}
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            days remaining
          </p>
        </div>
      </div>

      {/* Pacing Details */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Topics/Day Target */}
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--background-tertiary, #0f1420)',
          }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            Topics/Day Needed
          </p>
          <p
            className="mt-1 text-lg font-bold"
            style={{ color: 'var(--accent-secondary)' }}
          >
            {pacing.topicsPerDay}
          </p>
          <p
            className="text-[10px]"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            {pacing.topicsCovered}/{pacing.totalTopics} covered
          </p>
        </div>

        {/* Subject Coverage */}
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--background-tertiary, #0f1420)',
          }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            Subject Coverage
          </p>
          <p
            className="mt-1 text-lg font-bold"
            style={{ color: 'var(--foreground)' }}
          >
            {pacing.subjectsCovered}/{pacing.totalSubjects}
          </p>
          <p
            className="text-[10px]"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            subjects started
          </p>
        </div>

        {/* Pace Indicator */}
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: 'var(--card-border)',
            background: pace.bg,
          }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            Pace Status
          </p>
          <p className="mt-1 text-lg font-bold" style={{ color: pace.text }}>
            {pace.label}
          </p>
          <p
            className="text-[10px]"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            {pacing.topicsRemaining} topics remaining
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px]"
            style={{ color: 'var(--foreground-secondary)' }}
          >
            Overall Progress
          </span>
          <span
            className="text-[10px] font-medium"
            style={{ color: 'var(--foreground)' }}
          >
            {Math.round((pacing.topicsCovered / pacing.totalTopics) * 100)}%
          </span>
        </div>
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--border-primary, #2a2f3e)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, (pacing.topicsCovered / pacing.totalTopics) * 100)}%`,
              background: pace.text,
            }}
          />
        </div>
      </div>
    </div>
  );
}
