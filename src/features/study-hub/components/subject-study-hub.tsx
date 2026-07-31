'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Brain,
  Calculator,
  AlertCircle,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  getSubjectProgress,
  getSubjectRecentSessions,
  getSubjectWeakAreas,
  formatLastStudied,
} from '@/shared/lib/subject-utils';
import type {
  SubjectProgress,
  SubjectSession,
  SubjectWeakArea,
} from '@/shared/lib/subject-utils';

interface SubjectStudyHubProps {
  subjectName: string;
}

export function SubjectStudyHub({ subjectName }: SubjectStudyHubProps) {
  const [progress, setProgress] = useState<SubjectProgress | null>(null);
  const [recentSessions, setRecentSessions] = useState<SubjectSession[]>([]);
  const [weakAreas, setWeakAreas] = useState<SubjectWeakArea[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProgress(getSubjectProgress(subjectName));
    setRecentSessions(getSubjectRecentSessions(subjectName, 5));
    setWeakAreas(getSubjectWeakAreas(subjectName, 5));
    setMounted(true);
  }, [subjectName]);

  if (!mounted) {
    return (
      <div
        className="animate-pulse rounded-xl p-6"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="h-4 w-48 rounded bg-zinc-800" />
        <div className="mt-4 h-20 rounded bg-zinc-800/50" />
      </div>
    );
  }

  const encodedSubject = encodeURIComponent(subjectName);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
            Progress Overview
          </h3>
        </div>

        {progress && progress.totalQuestionsAnswered > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {progress.accuracy}%
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Accuracy
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {progress.totalQuestionsAnswered}
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Questions Done
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {progress.totalSessions}
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Sessions
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {formatLastStudied(progress.lastStudied)}
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Last Studied
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              No practice data yet. Start a session to track your progress.
            </p>
          </div>
        )}

        {/* Accuracy bar */}
        {progress && progress.totalQuestionsAnswered > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                {progress.correctAnswers} / {progress.totalQuestionsAnswered} correct
              </span>
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    progress.accuracy >= 70
                      ? 'var(--accent-success)'
                      : progress.accuracy >= 50
                        ? 'var(--accent-secondary)'
                        : '#ef4444',
                }}
              >
                {progress.accuracy}%
              </span>
            </div>
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--nav-hover-bg)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress.accuracy}%`,
                  backgroundColor:
                    progress.accuracy >= 70
                      ? 'var(--accent-success)'
                      : progress.accuracy >= 50
                        ? 'var(--accent-secondary)'
                        : '#ef4444',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3
          className="mb-3 text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/questions?subject=${encodedSubject}`}
            className="group rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--nav-hover-bg)' }}
              >
                <Brain className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Practice Questions
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Start a focused session
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/flashcards?subject=${encodedSubject}`}
            className="group rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--nav-hover-bg)' }}
              >
                <Layers className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Flashcards
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Review key concepts
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/formulas?subject=${encodedSubject}`}
            className="group rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--nav-hover-bg)' }}
              >
                <Calculator className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Formulas
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Key equations
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/mistakes?subject=${encodedSubject}`}
            className="group rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--nav-hover-bg)' }}
              >
                <AlertCircle className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Review Mistakes
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Fix weak points
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Weak Areas */}
      {weakAreas.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5" style={{ color: '#ef4444' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              Areas to Improve
            </h3>
          </div>
          <div className="space-y-3">
            {weakAreas.map((area) => (
              <div key={area.topic} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        area.accuracy >= 70
                          ? 'var(--accent-success)'
                          : area.accuracy >= 50
                            ? 'var(--accent-secondary)'
                            : '#ef4444',
                    }}
                  />
                  <p
                    className="text-sm truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {area.topic}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    {area.totalQuestions} Qs
                  </span>
                  <span
                    className="text-xs font-medium min-w-[36px] text-right"
                    style={{
                      color:
                        area.accuracy >= 70
                          ? 'var(--accent-success)'
                          : area.accuracy >= 50
                            ? 'var(--accent-secondary)'
                            : '#ef4444',
                    }}
                  >
                    {area.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5" style={{ color: 'var(--accent-secondary)' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              Recent Sessions
            </h3>
          </div>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/questions/session/${session.id}/results`}
                className="flex items-center justify-between rounded-lg p-3 transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--nav-hover-bg)' }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    className="h-4 w-4"
                    style={{
                      color:
                        session.accuracy >= 70
                          ? 'var(--accent-success)'
                          : session.accuracy >= 50
                            ? 'var(--accent-secondary)'
                            : '#ef4444',
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {session.mode} - {session.questionsAnswered} questions
                    </p>
                    <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                      {formatLastStudied(session.completedAt || session.startedAt)}
                    </p>
                  </div>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{
                    color:
                      session.accuracy >= 70
                        ? 'var(--accent-success)'
                        : session.accuracy >= 50
                          ? 'var(--accent-secondary)'
                          : '#ef4444',
                  }}
                >
                  {session.accuracy}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Study Resources */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5" style={{ color: 'var(--accent-secondary)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
            Study Resources
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={`/learn/${encodedSubject}`}
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--nav-hover-bg)' }}
          >
            <BookOpen className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Curriculum Readings
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Official CFA materials
              </p>
            </div>
          </Link>
          <Link
            href={`/insights?subject=${encodedSubject}`}
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--nav-hover-bg)' }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Detailed Analytics
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                In-depth performance data
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
