'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Target,
  Flame,
  ArrowRight,
  Clock,
  CalendarDays,
  Play,
} from 'lucide-react';
import { WeeklyProgress } from './weekly-progress';
import { AccuracyTrend } from './accuracy-trend';
import { Confetti } from '@/features/gamification/components/confetti';
import { CollapsibleSection } from '@/shared/components/ui/collapsible-section';
import { checkAndUpdateStreak, saveGamificationState } from '@/features/gamification/utils/gamification-storage';
import { getAllBadges, checkNewBadges, awardBadges } from '@/features/gamification/utils/badges';
import { calculateReadinessScore } from '@/features/gamification/utils/readiness-score';
import type { GamificationState, ReadinessResult } from '@/features/gamification/types';
import type { BadgeCheckContext } from '@/features/gamification/utils/badges';
import { useLocalStorageSessions } from '../hooks/use-local-storage-sessions';
import { seedCorporateIssuersAttempt } from '@/features/question-bank/utils/seed-corporate-issuers';
import { seedFsaAttempt } from '@/features/question-bank/utils/seed-fsa';
import { seedPortfolioManagementAttempt } from '@/features/question-bank/utils/seed-portfolio-management';
import { seedQuantitativeMethodsAttempt } from '@/features/question-bank/utils/seed-quantitative-methods';
import { seedAlternativeInvestmentsAttempt } from '@/features/question-bank/utils/seed-alternative-investments';
import { seedFixedIncomeAttempt } from '@/features/question-bank/utils/seed-fixed-income';
import { runSeedsIfNeeded } from '@/features/question-bank/utils/seed-guard';
import { seedFlashcardsFromAttempts } from '@/features/flashcards/utils/seed-flashcards';
import { getLatestAttempt } from '@/features/question-bank/utils/attempt-storage';
import { getLocalProfile } from '@/shared/lib/local-profile';
import type { PracticeAttempt } from '@/features/question-bank/types/attempt';

const ALL_SUBJECTS = ['Corporate Issuers', 'Financial Statement Analysis', 'Portfolio Management', 'Quantitative Methods', 'Alternative Investments', 'Fixed Income'] as const;

interface DashboardContentProps {
  displayName: string;
  level: string;
}

export function DashboardContent({ displayName, level }: DashboardContentProps) {
  const sessions = useLocalStorageSessions();
  const [latestAttempts] = useState<PracticeAttempt[]>(() => {
    if (typeof window === 'undefined') return [];
    runSeedsIfNeeded([seedCorporateIssuersAttempt, seedFsaAttempt, seedPortfolioManagementAttempt, seedQuantitativeMethodsAttempt, seedAlternativeInvestmentsAttempt, seedFixedIncomeAttempt, seedFlashcardsFromAttempts]);
    const results: PracticeAttempt[] = [];
    for (const subject of ALL_SUBJECTS) {
      const latest = getLatestAttempt(subject);
      if (latest) results.push(latest);
    }
    return results.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  });

  // Read exam date from localStorage
  const [examDate] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cfa-exam-date');
  });

  // Prefer localStorage profile values over server-provided defaults
  const [localProfile] = useState(() => {
    if (typeof window === 'undefined') return null;
    return getLocalProfile();
  });
  const effectiveDisplayName = localProfile?.displayName || displayName;
  const effectiveLevel = localProfile?.level || level;

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

      const configSubject = session.config?.subject;
      if (configSubject) {
        const subjects = configSubject.split(',').map(s => s.trim());
        for (const subj of subjects) {
          uniqueSubjects.add(subj);
          if (!subjectStats[subj]) {
            subjectStats[subj] = { correct: 0, total: 0, lastStudied: '' };
          }
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

    const updated = checkAndUpdateStreak(todayCount);

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

  // Keep getAllBadges call so gamification state stays in sync
  useMemo(() => getAllBadges(gamificationState), [gamificationState]);

  // Calculate days to exam
  const daysToExam = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    const exam = new Date(examDate);
    const diffTime = exam.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  }, [examDate]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      {/* Confetti Animation */}
      <Confetti show={showConfetti} />

      {/* Compact Welcome Bar */}
      <div className="flex items-center gap-3">
        <p className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Welcome back, {effectiveDisplayName}
        </p>
        <span className="inline-flex items-center rounded-full bg-[#C5A258]/15 px-2.5 py-0.5 text-xs font-semibold text-[#C5A258]">
          Level {effectiveLevel} &middot; {gamificationState.xp} XP
        </span>
        {daysToExam !== null && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            <CalendarDays className="h-3.5 w-3.5" />
            {daysToExam} days to exam
          </span>
        )}
      </div>

      {/* 4 Compact Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Questions Answered"
          value={stats.questionsAnswered.toString()}
          subtitle="Total practice"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Accuracy"
          value={stats.questionsAnswered > 0 ? `${stats.accuracy}%` : '--'}
          subtitle="Correct rate"
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Study Streak"
          value={gamificationState.streakDays.toString()}
          subtitle={gamificationState.streakDays > 0 ? 'Consecutive days' : 'Start today'}
        />
        <StatCard
          icon={daysToExam !== null ? <CalendarDays className="h-4 w-4" /> : <Target className="h-4 w-4" />}
          label={daysToExam !== null ? 'Days to Exam' : 'Readiness'}
          value={daysToExam !== null ? daysToExam.toString() : (stats.questionsAnswered >= 10 ? `${readiness.score}%` : '--')}
          subtitle={daysToExam !== null ? 'Stay on track' : (stats.questionsAnswered < 10 ? 'Need 10+ questions' : 'Multi-factor score')}
        />
      </div>

      {/* Primary CTA */}
      <Link
        href="/questions"
        className="group flex items-center justify-center gap-3 rounded-xl border border-[#C5A258]/30 p-5 transition-all duration-300 hover:border-[#C5A258]/60 hover:shadow-lg"
        style={{ background: 'var(--card-bg)' }}
      >
        <Play className="h-5 w-5 text-[#C5A258]" />
        <span className="text-base font-semibold text-[#C5A258]">Start Practice Session</span>
        <ArrowRight className="h-4 w-4 text-[#C5A258] transition-transform duration-300 group-hover:translate-x-1" />
      </Link>

      {/* Collapsible Details Section */}
      <CollapsibleSection title="Show Details" defaultOpen={false}>
        {/* Readiness Breakdown */}
        {stats.questionsAnswered >= 10 && (
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-secondary)' }}>
              Readiness Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <ReadinessFactor label="Accuracy" value={readiness.breakdown.accuracy} />
              <ReadinessFactor label="Coverage" value={readiness.breakdown.coverage} />
              <ReadinessFactor label="Consistency" value={readiness.breakdown.consistency} />
              <ReadinessFactor label="Calibration" value={readiness.breakdown.calibration} />
              <ReadinessFactor label="Recency" value={readiness.breakdown.recency} />
            </div>
            <p className="mt-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {readiness.predictionText}
            </p>
          </div>
        )}

        {/* Weakest Topics */}
        {stats.weakestTopics.length > 0 && (
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-secondary)' }}>
              Weakest Topics
            </h4>
            <div className="space-y-2">
              {stats.weakestTopics.map((topic) => (
                <div key={topic.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{topic.name}</span>
                      <span className="text-xs font-bold text-red-400">{topic.accuracy}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--card-border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${topic.accuracy}%`, background: topic.accuracy >= 60 ? '#C5A258' : '#ef4444' }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>{topic.total}q</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Practice Attempts (max 3) */}
        {latestAttempts.length > 0 && (
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--foreground-secondary)' }}>
              Recent Practice Attempts
            </h4>
            <div className="space-y-3">
              {latestAttempts.slice(0, 3).map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center gap-4 rounded-lg border p-3"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <AttemptScoreRing score={attempt.overallPercentage} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {attempt.subjectName}
                    </p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                      <span>{attempt.overallScore}/{attempt.overallTotal} correct</span>
                      <span>&middot;</span>
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/questions/attempts/${attempt.id}`}
                    className="text-xs font-medium text-[#C5A258] hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Progress & Accuracy Trend Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WeeklyProgress />
          <AccuracyTrend />
        </div>
      </CollapsibleSection>
    </div>
  );
}

/* ─── Stat Card (Compact) ─── */

function StatCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 transition-all duration-300 hover:shadow-md"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex items-center gap-2" style={{ color: 'var(--foreground-secondary)' }}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>{subtitle}</p>
    </div>
  );
}

/* ─── Readiness Factor Mini Display ─── */

function ReadinessFactor({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-lg border p-2"
      style={{ borderColor: 'var(--card-border)' }}
    >
      <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{value}</span>
      <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>{label}</span>
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--card-border)' }}
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

/* ─── Attempt Score Ring (SVG Circular Progress) ─── */

function AttemptScoreRing({ score }: { score: number }) {
  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#00843D' : score >= 60 ? '#C5A258' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--card-border)" strokeWidth={strokeWidth} />
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
      <span className="absolute text-[10px] font-bold" style={{ color }}>
        {Math.round(score)}%
      </span>
    </div>
  );
}
