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
  RotateCcw,
  ListChecks,
  FileBarChart,
} from 'lucide-react';
import { ExamCountdown } from './exam-countdown';
import { WeeklyProgress } from './weekly-progress';
import { AccuracyTrend } from './accuracy-trend';
import { AdvancedAnalytics } from './advanced-analytics';
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
import { getReviewQueueSummary } from '@/features/review-queue/utils/queue-builder';
import { SmartSessionCard } from '@/features/question-bank/components/smart-session-card';
import { OnboardingChecklist } from '@/shared/components/ui/onboarding-checklist';
import type { GamificationState, ReadinessResult, Badge } from '@/features/gamification/types';
import type { BadgeCheckContext } from '@/features/gamification/utils/badges';
import { useLocalStorageSessions } from '../hooks/use-local-storage-sessions';
import { seedCorporateIssuersAttempt } from '@/features/question-bank/utils/seed-corporate-issuers';
import { seedFsaAttempt } from '@/features/question-bank/utils/seed-fsa';
import { seedPortfolioManagementAttempt } from '@/features/question-bank/utils/seed-portfolio-management';
import { seedQuantitativeMethodsAttempt } from '@/features/question-bank/utils/seed-quantitative-methods';
import { seedAlternativeInvestmentsAttempt } from '@/features/question-bank/utils/seed-alternative-investments';
import { runSeedsIfNeeded } from '@/features/question-bank/utils/seed-guard';
import { seedFlashcardsFromAttempts } from '@/features/flashcards/utils/seed-flashcards';
import { getLatestAttempt } from '@/features/question-bank/utils/attempt-storage';
import { getLocalProfile } from '@/shared/lib/local-profile';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';

const ALL_SUBJECTS = ['Corporate Issuers', 'Financial Statement Analysis', 'Portfolio Management', 'Quantitative Methods', 'Alternative Investments'] as const;

interface DashboardContentProps {
  displayName: string;
  level: string;
}

export function DashboardContent({ displayName, level }: DashboardContentProps) {
  const sessions = useLocalStorageSessions();
  const [latestAttempts, setLatestAttempts] = useState<PracticeAttempt[]>([]);

  // Prefer localStorage profile values over server-provided defaults
  const [localProfile] = useState(() => {
    if (typeof window === 'undefined') return null;
    return getLocalProfile();
  });
  const effectiveDisplayName = localProfile?.displayName || displayName;
  const effectiveLevel = localProfile?.level || level;

  useEffect(() => {
    runSeedsIfNeeded([seedCorporateIssuersAttempt, seedFsaAttempt, seedPortfolioManagementAttempt, seedQuantitativeMethodsAttempt, seedAlternativeInvestmentsAttempt, seedFlashcardsFromAttempts]);
    const results: PracticeAttempt[] = [];
    for (const subject of ALL_SUBJECTS) {
      const latest = getLatestAttempt(subject);
      if (latest) results.push(latest);
    }
    setLatestAttempts(results.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ));
  }, []);

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

    // Weakest topics: subjects with lowest accuracy (min 3 questions)
    const weakestTopics = Object.entries(subjectStats)
      .filter(([, s]) => s.total >= 3)
      .map(([name, s]) => ({
        name,
        accuracy: Math.round((s.correct / s.total) * 100),
        total: s.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    return {
      questionsAnswered: totalQuestions,
      accuracy,
      sessionsCompleted: completedSessions.length,
      certainCorrect,
      certainTotal,
      hasMockCompleted,
      subjectStats,
      uniqueSubjects: uniqueSubjects.size,
      weakestTopics,
    };
  }, [sessions]);

  // Compute and sync gamification state based on sessions.
  // NOTE: This useMemo has localStorage side effects (checkAndUpdateStreak, saveGamificationState).
  // This is acceptable because: (1) all writes are idempotent (overwriting with same computed value),
  // (2) the project's lint rules prohibit setState in useEffect, and (3) awardBadges only sets
  // earnedAt on badges that don't already have it, preventing double-awards under strict mode.
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

  const reviewSummary = useMemo(() => getReviewQueueSummary(), []);

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
              CFA Level {effectiveLevel} Candidate
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              Welcome back, {effectiveDisplayName}
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

      {/* Onboarding Checklist (shown for new users) */}
      <OnboardingChecklist />

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

      {/* Smart Session Recommendations */}
      <SmartSessionCard />

      {/* Smart Review Card */}
      {reviewSummary.count > 0 && (
        <Link
          href="/review"
          className="group flex items-center gap-4 rounded-xl border p-5 transition-all duration-300 hover:shadow-lg"
          style={{ borderColor: 'var(--accent-primary)', background: 'var(--card-bg)' }}
        >
          <div className="rounded-full p-3" style={{ background: 'rgba(197, 162, 88, 0.1)' }}>
            <ListChecks className="h-6 w-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              You have {reviewSummary.count} items to review today
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              <Clock className="h-3 w-3" />
              <span>~{reviewSummary.estimatedMinutes} minutes</span>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors group-hover:opacity-90"
            style={{ background: 'var(--accent-primary)', color: '#ffffff' }}
          >
            Start Review
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      )}

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

      {/* Weakest Topics */}
      {stats.weakestTopics.length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Weakest Topics</h3>
          <div className="space-y-2">
            {stats.weakestTopics.map((topic) => (
              <div key={topic.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{topic.name}</span>
                    <span className="text-xs font-bold text-red-400">{topic.accuracy}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-primary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${topic.accuracy}%`, background: topic.accuracy >= 60 ? '#C5A258' : '#ef4444' }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{topic.total}q</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <NotificationBadges />

      {/* Exam Countdown */}
      <ExamCountdown />

      {/* Advanced Analytics */}
      <AdvancedAnalytics />

      {/* Recent Practice Attempts */}
      {latestAttempts.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Recent Practice Attempts
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <AttemptScoreRing score={attempt.overallPercentage} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {attempt.subjectName}
                      </h3>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor:
                            attempt.confidenceLevel === 'High'
                              ? 'rgba(0, 132, 61, 0.15)'
                              : attempt.confidenceLevel === 'Medium'
                                ? 'rgba(197, 162, 88, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                          color:
                            attempt.confidenceLevel === 'High'
                              ? '#00843D'
                              : attempt.confidenceLevel === 'Medium'
                                ? '#C5A258'
                                : '#ef4444',
                        }}
                      >
                        {attempt.confidenceLevel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {attempt.moduleResults.length} modules &middot; {attempt.overallScore}/{attempt.overallTotal} correct
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" />
                      {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/questions/attempts/${attempt.id}`}
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
            ))}
          </div>
        </div>
      )}

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
            href="/questions/attempts"
            icon={<Target className="h-5 w-5" />}
            label="All Attempts"
            description="View attempt results across all subjects"
          />
          <QuickAction
            href="/weekly-report"
            icon={<FileBarChart className="h-5 w-5" />}
            label="Weekly Report"
            description="View your weekly progress summary"
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
