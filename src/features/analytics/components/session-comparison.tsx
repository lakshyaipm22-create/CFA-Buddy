'use client';

import { useMemo } from 'react';
import { X, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import type { AnalyticsSession } from '../types';
import { formatDuration, formatTimestamp } from '../utils/time-utils';
import { sortByCfaOrder } from '@/shared/config/subjects';
import { getSessions } from '@/features/question-bank/utils/session-storage';

interface SessionComparisonProps {
  sessionA: AnalyticsSession;
  sessionB: AnalyticsSession;
  onClose: () => void;
}

export function SessionComparison({ sessionA, sessionB, onClose }: SessionComparisonProps) {
  // Determine which session is earlier (left) and which is later (right)
  const [earlier, later] = useMemo(() => {
    const timeA = new Date(sessionA.startedAt).getTime();
    const timeB = new Date(sessionB.startedAt).getTime();
    return timeA <= timeB ? [sessionA, sessionB] : [sessionB, sessionA];
  }, [sessionA, sessionB]);

  // Load raw sessions to find common questions
  const { commonQuestions, subjectComparison } = useMemo(() => {
    const rawSessions = getSessions();
    const rawA = rawSessions.find(s => s.id === earlier.id);
    const rawB = rawSessions.find(s => s.id === later.id);

    // Common questions analysis
    const commonQuestions: Array<{
      questionId: string;
      correctInA: boolean;
      correctInB: boolean;
      timeA: number;
      timeB: number;
    }> = [];

    if (rawA && rawB) {
      const attemptsB = new Map(rawB.attempts.map(a => [a.questionId, a]));
      for (const attemptA of rawA.attempts) {
        const attemptB = attemptsB.get(attemptA.questionId);
        if (attemptB) {
          commonQuestions.push({
            questionId: attemptA.questionId,
            correctInA: attemptA.correct,
            correctInB: attemptB.correct,
            timeA: attemptA.timeSpentSeconds,
            timeB: attemptB.timeSpentSeconds,
          });
        }
      }
    }

    // Subject-by-subject comparison
    // Build subject stats from raw session attempts if available
    const subjectStatsA: Record<string, { correct: number; total: number }> = {};
    const subjectStatsB: Record<string, { correct: number; total: number }> = {};

    // Since we only have subject at the session level (not per-question in AnalyticsSession),
    // build simplified subject comparison
    const subjects = new Set<string>();
    if (earlier.subject) subjects.add(earlier.subject);
    if (later.subject) subjects.add(later.subject);

    // If sessions have the same subject, compare directly
    if (earlier.subject) {
      subjectStatsA[earlier.subject] = {
        correct: earlier.correctAnswers,
        total: earlier.totalQuestions,
      };
    }
    if (later.subject) {
      subjectStatsB[later.subject] = {
        correct: later.correctAnswers,
        total: later.totalQuestions,
      };
    }

    const allSubjects = sortByCfaOrder([...subjects]);
    const subjectComparison = allSubjects.map(subject => ({
      subject,
      accuracyA: subjectStatsA[subject]
        ? Math.round((subjectStatsA[subject].correct / subjectStatsA[subject].total) * 100)
        : null,
      accuracyB: subjectStatsB[subject]
        ? Math.round((subjectStatsB[subject].correct / subjectStatsB[subject].total) * 100)
        : null,
    }));

    return { commonQuestions, subjectComparison };
  }, [earlier, later]);

  const commonImproved = commonQuestions.filter(q => !q.correctInA && q.correctInB).length;
  const commonDeclined = commonQuestions.filter(q => q.correctInA && !q.correctInB).length;
  const commonSame = commonQuestions.filter(q => q.correctInA === q.correctInB).length;

  return (
    <div
      className="rounded-xl border p-4 md:p-6"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
          Session Comparison
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors cursor-pointer"
          style={{
            color: 'var(--foreground-secondary)',
            background: 'color-mix(in srgb, var(--card-border) 50%, transparent)',
          }}
          aria-label="Close comparison"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Side by side stats */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 mb-6">
        <SessionSummaryCard session={earlier} label="Earlier Session" />
        <div className="flex items-center justify-center">
          <ArrowRight className="h-5 w-5" style={{ color: 'var(--foreground-secondary)' }} />
        </div>
        <SessionSummaryCard session={later} label="Later Session" />
      </div>

      {/* Score comparison bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ComparisonMetric
          label="Accuracy"
          valueA={`${earlier.accuracy.toFixed(1)}%`}
          valueB={`${later.accuracy.toFixed(1)}%`}
          improved={later.accuracy > earlier.accuracy}
          declined={later.accuracy < earlier.accuracy}
        />
        <ComparisonMetric
          label="Avg Time/Q"
          valueA={`${earlier.totalQuestions > 0 ? Math.round(earlier.durationSeconds / earlier.totalQuestions) : 0}s`}
          valueB={`${later.totalQuestions > 0 ? Math.round(later.durationSeconds / later.totalQuestions) : 0}s`}
          improved={
            later.totalQuestions > 0 && earlier.totalQuestions > 0 &&
            (later.durationSeconds / later.totalQuestions) < (earlier.durationSeconds / earlier.totalQuestions)
          }
          declined={
            later.totalQuestions > 0 && earlier.totalQuestions > 0 &&
            (later.durationSeconds / later.totalQuestions) > (earlier.durationSeconds / earlier.totalQuestions)
          }
        />
      </div>

      {/* Confidence distribution comparison */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
          Confidence Distribution
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConfidenceBar session={earlier} label="Earlier" />
          <ConfidenceBar session={later} label="Later" />
        </div>
      </div>

      {/* Common questions */}
      {commonQuestions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
            Common Questions ({commonQuestions.length})
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <StatBox
              label="Improved"
              value={commonImproved}
              color="var(--accent-success)"
            />
            <StatBox
              label="Declined"
              value={commonDeclined}
              color="#ef4444"
            />
            <StatBox
              label="Same"
              value={commonSame}
              color="var(--foreground-secondary)"
            />
          </div>
        </div>
      )}

      {/* Subject comparison */}
      {subjectComparison.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
            Subject-by-Subject
          </h4>
          <div className="space-y-2">
            {subjectComparison.map(({ subject, accuracyA, accuracyB }) => (
              <div
                key={subject}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'color-mix(in srgb, var(--card-border) 30%, transparent)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {subject}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    {accuracyA !== null ? `${accuracyA}%` : '-'}
                  </span>
                  <ArrowRight className="h-3 w-3" style={{ color: 'var(--foreground-secondary)' }} />
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color:
                        accuracyB !== null && accuracyA !== null && accuracyB > accuracyA
                          ? 'var(--accent-success)'
                          : accuracyB !== null && accuracyA !== null && accuracyB < accuracyA
                            ? '#ef4444'
                            : 'var(--foreground)',
                    }}
                  >
                    {accuracyB !== null ? `${accuracyB}%` : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Sub-components ===== */

function SessionSummaryCard({ session, label }: { session: AnalyticsSession; label: string }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--card-border)', background: 'var(--background)' }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
        {formatTimestamp(session.startedAt)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {session.accuracy >= 70 ? (
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--accent-success)' }} />
          ) : (
            <XCircle className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
          )}
          <span
            className="text-sm font-bold"
            style={{
              color: session.accuracy >= 70 ? 'var(--accent-success)' : '#ef4444',
            }}
          >
            {session.accuracy.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" style={{ color: 'var(--foreground-secondary)' }} />
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {formatDuration(session.durationSeconds)}
          </span>
        </div>
      </div>
      {session.subject && (
        <p className="text-xs mt-1" style={{ color: 'var(--accent-secondary)' }}>
          {session.subject}
        </p>
      )}
    </div>
  );
}

function ComparisonMetric({
  label,
  valueA,
  valueB,
  improved,
  declined,
}: {
  label: string;
  valueA: string;
  valueB: string;
  improved: boolean;
  declined: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ background: 'color-mix(in srgb, var(--card-border) 30%, transparent)' }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          {valueA}
        </span>
        <ArrowRight className="h-3 w-3" style={{ color: 'var(--foreground-secondary)' }} />
        <span
          className="text-sm font-bold"
          style={{
            color: improved
              ? 'var(--accent-success)'
              : declined
                ? '#ef4444'
                : 'var(--foreground)',
          }}
        >
          {valueB}
        </span>
      </div>
    </div>
  );
}

function ConfidenceBar({ session, label }: { session: AnalyticsSession; label: string }) {
  const { confidenceBreakdown, totalQuestions } = session;
  const certainPct =
    totalQuestions > 0 ? (confidenceBreakdown.certainCorrect / totalQuestions) * 100 : 0;
  const thinkSoPct =
    totalQuestions > 0 ? (confidenceBreakdown.thinkSo / totalQuestions) * 100 : 0;
  const guessPct =
    totalQuestions > 0 ? (confidenceBreakdown.guess / totalQuestions) * 100 : 0;

  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
      <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
        {certainPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${certainPct}%`, background: 'var(--accent-success)' }}
          />
        )}
        {thinkSoPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${thinkSoPct}%`, background: 'var(--accent-secondary)' }}
          />
        )}
        {guessPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${guessPct}%`, background: '#ef4444' }}
          />
        )}
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
          Certain: {Math.round(certainPct)}%
        </span>
        <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
          Think So: {Math.round(thinkSoPct)}%
        </span>
        <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
          Guess: {Math.round(guessPct)}%
        </span>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ background: `color-mix(in srgb, ${color} 8%, transparent)` }}
    >
      <p className="text-lg font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
    </div>
  );
}
