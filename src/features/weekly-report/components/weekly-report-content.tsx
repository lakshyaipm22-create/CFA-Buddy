'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Clock,
  CheckCircle2,
  BookOpen,
  Flame,
  Zap,
} from 'lucide-react';
import { Sparkline } from './sparkline';
import { generateWeeklyReport } from '../utils/report-generator';
import { getWeeklySnapshots } from '../utils/report-storage';
import { sortByCfaOrder } from '@/shared/config/subjects';
import type { WeeklyReport } from '../types';

export function WeeklyReportContent() {
  const [report] = useState<WeeklyReport | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return generateWeeklyReport();
    } catch {
      return null;
    }
  });

  const trendData = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const snapshots = getWeeklySnapshots();
    const recent = snapshots.slice(-4);
    return {
      questions: recent.map((s) => s.questionsAnswered),
      accuracy: recent.map((s) => s.accuracy),
      time: recent.map((s) => s.timeStudiedMinutes),
      streak: recent.map((s) => s.streakDays),
    };
  }, []);

  if (!report) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-[var(--foreground-secondary)]" />
          <p className="mt-4 text-lg font-medium" style={{ color: 'var(--foreground)' }}>
            No data available yet
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Complete some practice sessions to generate your weekly report.
          </p>
        </div>
      </div>
    );
  }

  const { current, previous, strengths, weaknesses, suggestedFocus, comparison } = report;
  const isFirstWeek = previous === null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Weekly Report
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          {formatDateRange(current.weekStart, current.weekEnd)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Questions"
          value={current.questionsAnswered.toString()}
          delta={isFirstWeek ? null : comparison.questionsDelta}
          deltaLabel="vs last week"
        />
        <SummaryCard
          icon={<Target className="h-5 w-5" />}
          label="Accuracy"
          value={current.questionsAnswered > 0 ? `${current.accuracy}%` : '--'}
          delta={isFirstWeek ? null : comparison.accuracyDelta}
          deltaLabel="vs last week"
          deltaIsPct
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5" />}
          label="Time Studied"
          value={formatMinutes(current.timeStudiedMinutes)}
          delta={isFirstWeek ? null : comparison.timeDelta}
          deltaLabel="min vs last week"
        />
        <SummaryCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Subjects"
          value={current.subjectsCovered.length.toString()}
          delta={null}
          deltaLabel=""
        />
      </div>

      {/* XP and Streak row */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <Zap className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>XP This Week</p>
            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {current.xp.toLocaleString()}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Streak</p>
            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {current.streakDays} day{current.streakDays !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Week-over-Week Comparison */}
      {isFirstWeek ? (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Week-over-Week
          </h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            First week! Keep studying and check back next week for trend comparisons.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Week-over-Week Comparison
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ComparisonItem
              label="Accuracy"
              delta={comparison.accuracyDelta}
              suffix="%"
            />
            <ComparisonItem
              label="Questions"
              delta={comparison.questionsDelta}
              suffix=""
            />
            <ComparisonItem
              label="Study Time"
              delta={comparison.timeDelta}
              suffix=" min"
            />
          </div>
        </div>
      )}

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Strengths */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#00843D]" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Top Strengths
            </h3>
          </div>
          {strengths.length > 0 ? (
            <ul className="space-y-2">
              {sortByCfaOrder(strengths).map((subject) => {
                const data = current.subjectAccuracy[subject];
                const acc = data ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <li key={subject} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                      {subject}
                    </span>
                    <span className="text-sm font-medium text-[#00843D]">
                      {acc}%
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Answer more questions to identify strengths.
            </p>
          )}
        </div>

        {/* Weaknesses */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#FF6B6B]" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Areas to Improve
            </h3>
          </div>
          {weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {sortByCfaOrder(weaknesses).map((subject) => {
                const data = current.subjectAccuracy[subject];
                const acc = data ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <li key={subject} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                      {subject}
                    </span>
                    <span className="text-sm font-medium text-[#FF6B6B]">
                      {acc}%
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Answer more questions to identify weak areas.
            </p>
          )}
        </div>
      </div>

      {/* Suggested Focus */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Suggested Focus for Next Week
          </h3>
        </div>
        <ul className="space-y-2">
          {suggestedFocus.map((suggestion, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                {suggestion}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4-Week Trend Sparklines */}
      {trendData && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            4-Week Trends
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <TrendItem
              label="Questions/Week"
              data={trendData.questions}
              currentValue={current.questionsAnswered.toString()}
              color="var(--accent-primary)"
            />
            <TrendItem
              label="Accuracy"
              data={trendData.accuracy}
              currentValue={`${current.accuracy}%`}
              color="#00843D"
            />
            <TrendItem
              label="Time (min)"
              data={trendData.time}
              currentValue={current.timeStudiedMinutes.toString()}
              color="#002B5C"
            />
            <TrendItem
              label="Streak"
              data={trendData.streak}
              currentValue={current.streakDays.toString()}
              color="#FF6B6B"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function SummaryCard({
  icon,
  label,
  value,
  delta,
  deltaLabel,
  deltaIsPct,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: number | null;
  deltaLabel: string;
  deltaIsPct?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="mb-2" style={{ color: 'var(--accent-primary)' }}>
        {icon}
      </div>
      <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
      <p className="mt-1 text-xl font-bold" style={{ color: 'var(--foreground)' }}>
        {value}
      </p>
      {delta !== null && (
        <p className="mt-1 flex items-center gap-1 text-xs">
          <DeltaIcon delta={delta} />
          <span
            style={{
              color: delta > 0 ? '#00843D' : delta < 0 ? '#FF6B6B' : 'var(--foreground-secondary)',
            }}
          >
            {delta > 0 ? '+' : ''}
            {delta}
            {deltaIsPct ? '%' : ''} {deltaLabel}
          </span>
        </p>
      )}
    </div>
  );
}

function ComparisonItem({
  label,
  delta,
  suffix,
}: {
  label: string;
  delta: number;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] p-3">
      <DeltaIcon delta={delta} />
      <div>
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          {label}
        </p>
        <p
          className="text-sm font-semibold"
          style={{
            color: delta > 0 ? '#00843D' : delta < 0 ? '#FF6B6B' : 'var(--foreground-secondary)',
          }}
        >
          {delta > 0 ? '+' : ''}
          {delta}
          {suffix}
        </p>
      </div>
    </div>
  );
}

function DeltaIcon({ delta }: { delta: number }) {
  if (delta > 0) return <TrendingUp className="h-3.5 w-3.5 text-[#00843D]" />;
  if (delta < 0) return <TrendingDown className="h-3.5 w-3.5 text-[#FF6B6B]" />;
  return <Minus className="h-3.5 w-3.5" style={{ color: 'var(--foreground-secondary)' }} />;
}

function TrendItem({
  label,
  data,
  currentValue,
  color,
}: {
  label: string;
  data: number[];
  currentValue: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Sparkline data={data} width={100} height={32} color={color} />
      <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
        {currentValue}
      </p>
      <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
        {label}
      </p>
    </div>
  );
}

// ─── Utilities ───

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('en-US', options);
  const endStr = endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
