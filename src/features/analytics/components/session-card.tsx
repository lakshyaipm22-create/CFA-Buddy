'use client';

import Link from 'next/link';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { AnalyticsSession } from '../types';
import { formatTimestamp, formatDuration, getRelativeTime } from '../utils/time-utils';

interface SessionCardProps {
  session: AnalyticsSession;
}

const MODE_LABELS: Record<string, string> = {
  Topic: 'Topic Test',
  Subject: 'Subject Test',
  Mixed: 'Mixed Test',
  QuickTopic: 'Quick Test',
  AdaptiveRetest: 'Adaptive Retest',
  Random: 'Random Test',
  WeakTopic: 'Weak Topic',
  Mock: 'Mock Exam',
};

export function SessionCard({ session }: SessionCardProps) {
  const { confidenceBreakdown, totalQuestions } = session;
  const certainPct =
    totalQuestions > 0 ? (confidenceBreakdown.certainCorrect / totalQuestions) * 100 : 0;
  const thinkSoPct =
    totalQuestions > 0 ? (confidenceBreakdown.thinkSo / totalQuestions) * 100 : 0;
  const guessPct =
    totalQuestions > 0 ? (confidenceBreakdown.guess / totalQuestions) * 100 : 0;

  return (
    <Link
      href={`/analytics/session/${session.id}`}
      className="block rounded-xl border p-4 transition-all hover:scale-[1.01]"
      style={{
        borderColor: 'var(--card-border)',
        background: 'var(--card-bg)',
      }}
    >
      {/* Header: Date + Mode */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {formatTimestamp(session.startedAt)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
            {getRelativeTime(session.startedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge label={MODE_LABELS[session.mode] ?? session.mode} color="var(--accent-primary)" />
          {session.isTimed && <Badge label="Timed" color="var(--accent-secondary)" />}
          {!session.isTimed && <Badge label="Untimed" color="var(--foreground-secondary)" />}
          {session.mode === 'Mock' && <Badge label="Mock" color="#ef4444" />}
        </div>
      </div>

      {/* Subject if filtered */}
      {session.subject && (
        <p className="text-xs mb-2" style={{ color: 'var(--accent-secondary)' }}>
          {session.subject}
        </p>
      )}

      {/* Score + Duration row */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          {session.accuracy >= 70 ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
          ) : (
            <XCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
          )}
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {session.correctAnswers}/{session.totalQuestions}
          </span>
          <span
            className="text-sm font-bold"
            style={{
              color:
                session.accuracy >= 70
                  ? 'var(--accent-success)'
                  : session.accuracy >= 50
                    ? 'var(--accent-secondary)'
                    : '#ef4444',
            }}
          >
            ({session.accuracy.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" style={{ color: 'var(--foreground-secondary)' }} />
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {formatDuration(session.durationSeconds)}
          </span>
        </div>
      </div>

      {/* Confidence breakdown mini-bar */}
      <div className="w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            Confidence
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
          {certainPct > 0 && (
            <div
              className="h-full"
              style={{ width: `${certainPct}%`, background: 'var(--accent-success)' }}
              title={`Certain & Correct: ${confidenceBreakdown.certainCorrect}`}
            />
          )}
          {thinkSoPct > 0 && (
            <div
              className="h-full"
              style={{ width: `${thinkSoPct}%`, background: 'var(--accent-secondary)' }}
              title={`Think So: ${confidenceBreakdown.thinkSo}`}
            />
          )}
          {guessPct > 0 && (
            <div
              className="h-full"
              style={{ width: `${guessPct}%`, background: '#ef4444' }}
              title={`Guess: ${confidenceBreakdown.guess}`}
            />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <Legend color="var(--accent-success)" label="Certain+Correct" />
          <Legend color="var(--accent-secondary)" label="Think So" />
          <Legend color="#ef4444" label="Guess" />
        </div>
      </div>
    </Link>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </span>
    </div>
  );
}
