'use client';

import { useMemo } from 'react';
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
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import { ExamCountdown } from './exam-countdown';
import { WeeklyProgress } from './weekly-progress';
import { AccuracyTrend } from './accuracy-trend';
import { DailyStudyPlan } from '@/features/study-plan/components/daily-study-plan';
import { NotificationBadges } from '@/features/notifications/components/notification-badges';
import { XPLevelBadge } from '@/features/gamification/components/xp-level-badge';
import { StreakDisplay } from '@/features/gamification/components/streak-display';
import { WeeklyGoal } from '@/features/gamification/components/weekly-goal';
import { BadgesDisplay } from '@/features/gamification/components/badges-display';
import { Confetti } from '@/features/gamification/components/confetti';
import { checkAndUpdateStreak, saveGamificationState } from '@/features/gamification/utils/gamification-storage';
import { getAllBadges, checkNewBadges, awardBadges } from '@/features/gamification/utils/badges';
import { calculateReadinessScore } from '@/features/gamification/utils/readiness-score';
import type { GamificationState, ReadinessResult, Badge } from '@/features/gamification/types';
import type { BadgeCheckContext } from '@/features/gamification/utils/badges';
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
    let certainTotal = 0;
    let certainCorrect = 0;
    let hasMockCompleted = false;
    const subjectStats: Record<string, { correct: number; total: number; lastStudied: string }> = {};
    const uniqueSubjects = new Set<string>();

    for (const session of completedSessions) {
      // Check for mock sessions
      if (session.mode === 'Mock') {
        hasMockCompleted = true;
      }

      for (const attempt of session.attempts ?? []) {
        totalQuestions++;
        if (attempt.correct) totalCorrect++;
        if (attempt.confidence === 'Certain') {
          certainTotal++;
          if (attempt.correct) certainCorrect++;
        }
      }

      // Extract subject from config and track subject stats
      const configSubject = session.config?.subject;
      if (configSubject) {
        const subjects = configSubject.split(',').map(s => s.trim());
        for (const subj of subjects) {
          uniqueSubjects.add(subj);
          if (!subjectStats[subj]) {
            subjectStats[subj] = { correct: 0, total: 0, lastStudied: '' };
          }
          // If single subject session, count all attempts toward it
          if (subjects.length === 1) {
            for (const attempt of session.attempts ?? []) {
              subjectStats[subj].total++;
              if (attempt.correct) subjectStats[subj].correct++;
              const ts = attempt.timestamp ?? session.completedAt ?? '';
              if (ts > subjectStats[subj].lastStudied) {
                subjectStats[subj].lastStudied = ts;
              }
            }
          }
        }
      }
    }

    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return {
      questionsAnswered: totalQuestions,
      accuracy,
      sessionsCompleted: completedSessions.length,
      certainCorrect,
      certainTotal,
      hasMockCompleted,
      subjectStats,
      uniqueSubjects: uniqueSubjects.size,
    };
  }, [sessions]);

  // Compute and sync gamification state based on sessions
  const gamificationData = useMemo(() => {
    if (typeof window === 'undefined') {
      const defaultState: GamificationState = { xp: 0, level: 0, streakDays: 0, lastActivityDate: '', weeklyQuestionsAnswered: 0, weekStartDate: '', badges: [], dailyCounts: {} };
      return { state: defaultState, newBadgesEarned: false };
    }

    // Count questions answered today
    const today = new Date().toISOString().split('T')[0];
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    let todayCount = 0;
    for (const session of completedSessions) {
      for (const attempt of session.attempts ?? []) {
        if (attempt.timestamp && attempt.timestamp.startsWith(today)) {
          todayCount++;
        }
      }
    }

    // Update streak (also persists to localStorage)
    const updated = checkAndUpdateStreak(todayCount);

    // Check for new badges
    const context: BadgeCheckContext = {
      totalQuestions: stats.questionsAnswered,
      streakDays: updated.streakDays,
      uniqueSubjects: stats.uniqueSubjects,
      hasMockCompleted: stats.hasMockCompleted,
      overallAccuracy: stats.accuracy,
      level: updated.level,
    };

    const newBadgeIds = checkNewBadges(updated, context);
    if (newBadgeIds.length > 0) {
      const awarded = awardBadges(updated, newBadgeIds);
      saveGamificationState(awarded);
      return { state: awarded, newBadgesEarned: true };
    }

    return { state: updated, newBadgesEarned: false };
  }, [sessions, stats]);

  const gamificationState = gamificationData.state;
  const showConfetti = gamificationData.newBadgesEarned;

  // Calculate readiness score
  const readiness: ReadinessResult = useMemo(() => {
    return calculateReadinessScore({
      subjectStats: stats.subjectStats,
      streakDays: gamificationState.streakDays,
      certainCorrect: stats.certainCorrect,
      certainTotal: stats.certainTotal,
      totalQuestions: stats.questionsAnswered,
    });
  }, [stats, gamificationState.streakDays]);

  const allBadges: Badge[] = useMemo(() => getAllBadges(gamificationState), [gamificationState]);

  return (
    <div className="space-y-8 pb-8">
      {/* Confetti Animation */}
      <Confetti show={showConfetti} />

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
            {/* XP / Level Display */}
            <div className="mt-4 max-w-xs">
              <XPLevelBadge xp={gamificationState.xp} level={gamificationState.level} />
            </div>
          </div>

          {/* Exam Readiness Gauge */}
          <div className="flex flex-col items-center">
            <ReadinessGauge value={readiness.score} />
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
              {stats.questionsAnswered < 10 ? 'Answer 10+ questions' : 'Exam Readiness'}
            </p>
          </div>
        </div>
      </div>

      {/* Readiness Breakdown */}
      {stats.questionsAnswered >= 10 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Readiness Breakdown</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <ReadinessFactor label="Accuracy" value={readiness.breakdown.accuracy} />
            <ReadinessFactor label="Coverage" value={readiness.breakdown.coverage} />
            <ReadinessFactor label="Consistency" value={readiness.breakdown.consistency} />
            <ReadinessFactor label="Calibration" value={readiness.breakdown.calibration} />
            <ReadinessFactor label="Recency" value={readiness.breakdown.recency} />
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {readiness.predictionText}
          </p>
        </div>
      )}

      {/* Gamification Row: Streak + Weekly Goal */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StreakDisplay streakDays={gamificationState.streakDays} dailyCounts={gamificationState.dailyCounts} />
        <WeeklyGoal current={gamificationState.weeklyQuestionsAnswered} target={100} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<Gauge className="h-5 w-5" />}
          label="Exam Readiness"
          value={stats.questionsAnswered >= 10 ? `${readiness.score}%` : '--'}
          subtitle={stats.questionsAnswered < 10 ? 'Need 10+ questions' : 'Multi-factor analysis'}
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
          value={gamificationState.streakDays.toString()}
          subtitle={gamificationState.streakDays > 0 ? 'Consecutive days' : 'Answer 10+ daily'}
          accent="gold"
        />
        <MetricCard
          icon={<BrainCircuit className="h-5 w-5" />}
          label="Confidence Calibration"
          value={stats.certainTotal > 0 ? `${Math.round((stats.certainCorrect / stats.certainTotal) * 100)}%` : '--'}
          subtitle="Certain answers that were correct"
          accent="green"
        />
      </div>

      {/* Badges */}
      <BadgesDisplay badges={allBadges} />

      {/* Notifications */}
      <NotificationBadges />

      {/* Exam Countdown */}
      <ExamCountdown />

      {/* AI Study Plan */}
      <DailyStudyPlan />

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
            href="/practice"
            icon={<RotateCcw className="h-5 w-5" />}
            label="Start Review"
            description="Spaced repetition review"
          />
          <QuickAction
            href="/questions"
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Review Mistakes"
            description="Learn from incorrect answers"
          />
          <QuickAction
            href="/resources"
            icon={<FolderOpen className="h-5 w-5" />}
            label="Browse Resources"
            description="Access study materials"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Readiness Factor Mini Display ─── */

function ReadinessFactor({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-[var(--border-primary)] p-2">
      <span className="text-lg font-bold text-[var(--text-primary)]">{value}</span>
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--border-primary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: value >= 70 ? '#00843D' : value >= 40 ? '#C5A258' : '#FF6B6B',
          }}
        />
      </div>
    </div>
  );
}

/* ─── Readiness Gauge (SVG Circular Progress) ─── */

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
