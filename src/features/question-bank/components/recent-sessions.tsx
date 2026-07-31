'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions } from '../utils/session-storage';
import type { QuestionSession } from '../types';

function loadRecentSessions(): QuestionSession[] {
  const all = getSessions();
  return all
    .filter(s => s.status === 'completed')
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getScore(session: QuestionSession): number {
  const total = session.attempts.length;
  if (total === 0) return 0;
  const correct = session.attempts.filter(a => a.correct).length;
  return Math.round((correct / total) * 100);
}

export function RecentSessions() {
  const router = useRouter();

  const [sessions, setSessions] = useState<QuestionSession[]>(() => loadRecentSessions());

  useEffect(() => {
    function handleFocus() {
      setSessions(loadRecentSessions());
    }

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (sessions.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h2
          className="mb-3 text-lg font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          Recent Sessions
        </h2>
        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          No sessions yet. Complete a practice session to see your history here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <h2
        className="mb-3 text-lg font-semibold"
        style={{ color: 'var(--foreground)' }}
      >
        Recent Sessions
      </h2>
      <div className="space-y-2">
        {sessions.map(session => {
          const score = getScore(session);
          const scoreColor =
            score >= 70
              ? 'var(--accent-success)'
              : score >= 50
                ? 'var(--accent-secondary)'
                : '#ef4444';

          return (
            <button
              key={session.id}
              onClick={() => router.push(`/questions/review/${session.id}`)}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all hover:opacity-80"
              style={{
                backgroundColor: 'var(--background-tertiary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--foreground)' }}
                >
                  {session.completedAt ? formatDate(session.completedAt) : formatDate(session.startedAt)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  {session.questionIds.length} questions
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  {session.mode}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  {session.config.subject || 'All Subjects'}
                </span>
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: scoreColor }}
              >
                {score}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
