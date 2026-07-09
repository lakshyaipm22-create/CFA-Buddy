'use client';

import { useMemo } from 'react';
import { ExamCountdown } from './exam-countdown';
import { WeeklyProgress } from './weekly-progress';
import { useLocalStorageSessions } from '../hooks/use-local-storage-sessions';

interface DashboardContentProps {
  displayName: string;
  level: string;
}

export function DashboardContent({ displayName, level }: DashboardContentProps) {
  const sessions = useLocalStorageSessions();

  const stats = useMemo(() => {
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    let totalQuestions = 0;
    let totalCorrect = 0;
    for (const session of completedSessions) {
      for (const attempt of session.attempts ?? []) {
        totalQuestions++;
        if (attempt.correct) totalCorrect++;
      }
    }
    return {
      questionsAnswered: totalQuestions,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      streak: completedSessions.length,
    };
  }, [sessions]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-zinc-400">
          Welcome back, {displayName}. CFA Level {level}.
        </p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Exam Readiness"
          value={stats.questionsAnswered >= 10 ? `${Math.min(stats.accuracy, 100)}%` : '—'}
          subtitle={stats.questionsAnswered < 10 ? 'Answer 10+ questions' : 'Based on accuracy'}
          color="text-[#C5A258]"
        />
        <MetricCard
          label="Questions Solved"
          value={stats.questionsAnswered.toString()}
          subtitle="Total attempts"
          color="text-white"
        />
        <MetricCard
          label="Accuracy"
          value={stats.questionsAnswered > 0 ? `${stats.accuracy}%` : '—'}
          subtitle="Correct answers"
          color="text-[#00843D]"
        />
        <MetricCard
          label="Sessions"
          value={stats.streak.toString()}
          subtitle="Completed tests"
          color="text-[#002B5C]"
        />
      </div>

      {/* Exam Countdown */}
      <ExamCountdown />

      {/* Weekly Progress */}
      <WeeklyProgress />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <QuickAction href="/learn" label="Continue Studying" description="Pick up where you left off" />
        <QuickAction href="/questions" label="Practice Questions" description="Start a test session" />
        <QuickAction href="/resources" label="Browse Resources" description="View your study materials" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle, color }: { label: string; value: string; subtitle: string; color: string }) {
  return (
    <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-5">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{subtitle}</p>
    </div>
  );
}

function QuickAction({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <a
      href={href}
      className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-4 transition-colors hover:border-[#002B5C]"
    >
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </a>
  );
}
