'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gauge,
  CheckCircle2,
  Target,
  BookOpen,
  Flame,
  BrainCircuit,
  ArrowRight,
  Play,
  HelpCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { ExamCountdown } from './exam-countdown';
import { WeeklyProgress } from './weekly-progress';
import { AccuracyTrend } from './accuracy-trend';
import { useLocalStorageSessions } from '../hooks/use-local-storage-sessions';
import { seedCorporateIssuersAttempt } from '@/features/question-bank/utils/seed-corporate-issuers';
import { getLatestAttempt } from '@/features/question-bank/utils/attempt-storage';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';

interface DashboardContentProps {
  displayName: string;
  level: string;
}

export function DashboardContent({ displayName, level }: DashboardContentProps) {
  const sessions = useLocalStorageSessions();
  const [latestAttempt, setLatestAttempt] = useState<PracticeAttempt | null>(null);

  useEffect(() => {
    seedCorporateIssuersAttempt();
    const latest = getLatestAttempt('Corporate Issuers');
    setLatestAttempt(latest);
  }, []);

  const stats = useMemo(() => {
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    let totalQuestions = 0;
    let totalCorrect = 0;
    let certainTotal = 0;
    let certainCorrect = 0;
    let currentStreak = 0;

    for (const session of completedSessions) {
      for (const attempt of session.attempts ?? []) {
        totalQuestions++;
        if (attempt.correct) totalCorrect++;
        if (attempt.confidence === 'Certain') {
          certainTotal++;
          if (attempt.correct) certainCorrect++;
        }
      }
    }

    // Calculate study streak (consecutive sessions)
    currentStreak = completedSessions.length;

    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const readiness = totalQuestions >= 10 ? Math.min(accuracy, 100) : 0;
    const confidenceCalibration =
      certainTotal > 0 ? Math.round((certainCorrect / certainTotal) * 100) : 0;

    return {
      questionsAnswered: totalQuestions,
      accuracy,
      readiness,
      sessionsCompleted: completedSessions.length,
      streak: currentStreak,
      confidenceCalibration,
      certainTotal,
    };
  }, [sessions]);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#002B5C]/10 via-transparent to-[#C5A258]/5" />
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-start">
          {/* Text Greeting */}
          <div className="flex-1">
            <p className="text-sm font-medium tracking-wide text-[#C5A258] uppercase">
              CFA Level {level} Candidate
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              Welcome back, {displayName}
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              {stats.questionsAnswered === 0
                ? 'Start your first practice session to track your progress.'
                : `You've answered ${stats.questionsAnswered} questions with ${stats.accuracy}% accuracy.`}
            </p>
          </div>

          {/* Exam Readiness Gauge */}
          <div className="flex flex-col items-center">
            <ReadinessGauge value={stats.readiness} />
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
              {stats.questionsAnswered < 10 ? 'Answer 10+ questions' : 'Exam Readiness'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<Gauge className="h-5 w-5" />}
          label="Exam Readiness"
          value={stats.questionsAnswered >= 10 ? `${stats.readiness}%` : '--'}
          subtitle={stats.questionsAnswered < 10 ? 'Need 10+ questions' : 'Based on overall accuracy'}
          accent="gold"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Questions Solved"
          value={stats.questionsAnswered.toString()}
          subtitle="Total attempts across all sessions"
          accent="white"
        />
        <MetricCard
          icon={<Target className="h-5 w-5" />}
          label="Accuracy"
          value={stats.questionsAnswered > 0 ? `${stats.accuracy}%` : '--'}
          subtitle="Correct answers rate"
          accent="green"
        />
        <MetricCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Sessions Completed"
          value={stats.sessionsCompleted.toString()}
          subtitle="Practice sessions finished"
          accent="navy"
        />
        <MetricCard
          icon={<Flame className="h-5 w-5" />}
          label="Study Streak"
          value={stats.streak.toString()}
          subtitle="Keep the momentum going"
          accent="gold"
        />
        <MetricCard
          icon={<BrainCircuit className="h-5 w-5" />}
          label="Confidence Calibration"
          value={stats.certainTotal > 0 ? `${stats.confidenceCalibration}%` : '--'}
          subtitle="Certain answers that were correct"
          accent="green"
        />
      </div>

      {/* Exam Countdown */}
      <ExamCountdown />

      {/* Recent Practice Attempts */}
      {latestAttempt && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Recent Practice Attempts
          </h2>
          <div
            className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5 transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <AttemptScoreRing score={latestAttempt.overallPercentage} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {latestAttempt.subjectName}
                  </h3>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor:
                        latestAttempt.confidenceLevel === 'High'
                          ? 'rgba(0, 132, 61, 0.15)'
                          : latestAttempt.confidenceLevel === 'Medium'
                            ? 'rgba(197, 162, 88, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                      color:
                        latestAttempt.confidenceLevel === 'High'
                          ? '#00843D'
                          : latestAttempt.confidenceLevel === 'Medium'
                            ? '#C5A258'
                            : '#ef4444',
                    }}
                  >
                    {latestAttempt.confidenceLevel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {latestAttempt.moduleResults.length} modules &middot; {latestAttempt.overallScore}/{latestAttempt.overallTotal} correct
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Clock className="h-3 w-3" />
                  {new Date(latestAttempt.completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <Link
                href={`/questions/attempts/${latestAttempt.id}`}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: '#002B5C',
                  color: '#C5A258',
                }}
              >
                View Details
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Accuracy Trend + Weekly Progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AccuracyTrend />
        <WeeklyProgress />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/learn"
            icon={<Play className="h-5 w-5" />}
            label="Continue Studying"
            description="Pick up where you left off"
          />
          <QuickAction
            href="/questions"
            icon={<HelpCircle className="h-5 w-5" />}
            label="Practice Questions"
            description="Start a new test session"
          />
          <QuickAction
            href="/questions"
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Review Mistakes"
            description="Learn from incorrect answers"
          />
          <QuickAction
            href="/questions/attempts"
            icon={<Target className="h-5 w-5" />}
            label="Corporate Issuers"
            description="View attempt results"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Readiness Gauge (SVG Circular Progress) ─── */

function AttemptScoreRing({ score }: { score: number }) {
  const size = 48;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#00843D' : score >= 60 ? '#C5A258' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-primary)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {Math.round(score)}%
      </span>
    </div>
  );
}

function ReadinessGauge({ value }: { value: number }) {
  const radius = 54;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 108 108">
        {/* Background circle */}
        <circle
          cx="54"
          cy="54"
          r={normalizedRadius}
          fill="none"
          stroke="var(--border-primary)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx="54"
          cy="54"
          r={normalizedRadius}
          fill="none"
          stroke="#C5A258"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--text-primary)]">
          {value > 0 ? `${value}%` : '--'}
        </span>
      </div>
    </div>
  );
}

/* ─── Metric Card ─── */

type AccentColor = 'gold' | 'white' | 'green' | 'navy';

const accentStyles: Record<AccentColor, { text: string; border: string }> = {
  gold: { text: 'text-[#C5A258]', border: 'hover:border-[#C5A258]/50' },
  white: { text: 'text-[var(--text-primary)]', border: 'hover:border-[var(--text-secondary)]/40' },
  green: { text: 'text-[#00843D]', border: 'hover:border-[#00843D]/50' },
  navy: { text: 'text-[#002B5C]', border: 'hover:border-[#002B5C]/50' },
};

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  accent: AccentColor;
}) {
  const style = accentStyles[accent];

  return (
    <div
      className={`group rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5 transition-all duration-300 ${style.border} hover:shadow-lg`}
    >
      <div className="flex items-center gap-3">
        <div className={`${style.text} opacity-70 transition-opacity group-hover:opacity-100`}>
          {icon}
        </div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      </div>
      <p className={`mt-3 text-3xl font-bold ${style.text}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}

/* ─── Quick Action Card ─── */

function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-4 transition-all duration-300 hover:border-[#C5A258]/40 hover:shadow-md"
    >
      <div className="mt-0.5 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[#C5A258]">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)] transition-colors duration-300 group-hover:text-[#C5A258]">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 text-[var(--text-muted)] opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#C5A258] group-hover:opacity-100" />
    </Link>
  );
}
