'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Circle,
  BookOpen,
  Target,
  Clock,
  AlertCircle,
  Play,
  TrendingUp,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import {
  generateStudyPlan,
  getCompletedDays,
  markDayCompleted,
  unmarkDayCompleted,
} from '../utils/plan-generator';
import type { DailyPlanItem, StudyPlan } from '../utils/plan-generator';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTypeIcon(type: 'learn' | 'review' | 'practice') {
  switch (type) {
    case 'learn':
      return <GraduationCap className="h-3.5 w-3.5" />;
    case 'review':
      return <RotateCcw className="h-3.5 w-3.5" />;
    case 'practice':
      return <Target className="h-3.5 w-3.5" />;
  }
}

function getTypeColor(type: 'learn' | 'review' | 'practice'): string {
  switch (type) {
    case 'learn':
      return '#3b82f6'; // blue
    case 'review':
      return '#00843D'; // green
    case 'practice':
      return '#C5A258'; // gold
  }
}

function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return '#ef4444'; // red
    case 'medium':
      return '#C5A258'; // gold
    case 'low':
      return '#00843D'; // green
  }
}

export function StudyPlanContent() {
  const router = useRouter();

  const [plan] = useState<StudyPlan>(() => generateStudyPlan(70));
  const [completedDays, setCompletedDays] = useState<string[]>(() => getCompletedDays());

  // Get the 7-day window from today
  const weekItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(formatDate(d));
    }

    // Map dates to plan items
    return dates.map(date => {
      const items = plan.items.filter(item => item.date === date);
      return { date, items };
    });
  }, [plan]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const weekDates = weekItems.map(w => w.date);
    const weekPlanItems = plan.items.filter(item => weekDates.includes(item.date));
    const subjects = new Set(weekPlanItems.map(item => item.subject));
    const totalQuestions = weekPlanItems.reduce((sum, item) => sum + item.questionTarget, 0);
    const completedThisWeek = weekDates.filter(d => completedDays.includes(d)).length;

    return {
      daysRemaining: plan.daysRemaining,
      subjectsCovered: subjects.size,
      totalQuestions,
      completedThisWeek,
      totalDaysThisWeek: weekItems.filter(w => w.items.length > 0).length,
    };
  }, [plan, weekItems, completedDays]);

  const handleToggleComplete = useCallback((date: string) => {
    setCompletedDays(prev => {
      if (prev.includes(date)) {
        unmarkDayCompleted(date);
        return prev.filter(d => d !== date);
      } else {
        markDayCompleted(date);
        return [...prev, date];
      }
    });
  }, []);

  const handleStartStudy = useCallback((item: DailyPlanItem) => {
    // Store the recommended subject for the practice session
    localStorage.setItem('cfa-buddy-practice-subject', item.subject);
    router.push('/questions');
  }, [router]);

  // If no exam date is set, show a prompt
  if (!plan.examDate) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <AlertCircle className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--accent-secondary)' }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          Set Your Exam Date
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
          To generate a personalized study plan, we need to know when your exam is.
          Set your exam date in the Exam Plan section.
        </p>
        <Link
          href="/exam-plan"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--accent-secondary)' }}
        >
          <Calendar className="h-4 w-4" />
          Set Exam Date
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Days to Exam"
          value={String(summaryStats.daysRemaining)}
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Subjects This Week"
          value={String(summaryStats.subjectsCovered)}
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Questions Targeted"
          value={String(summaryStats.totalQuestions)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Days Completed"
          value={`${summaryStats.completedThisWeek}/${summaryStats.totalDaysThisWeek}`}
        />
      </div>

      {/* Weekly Calendar View */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          This Week&apos;s Plan
        </h3>

        <div className="space-y-3">
          {weekItems.map(({ date, items }) => {
            if (items.length === 0) return null;
            const isCompleted = completedDays.includes(date);
            const isToday = date === formatDate(new Date());

            return (
              <div
                key={date}
                className="rounded-xl border transition-all"
                style={{
                  borderColor: isToday ? 'var(--accent-secondary)' : 'var(--card-border)',
                  background: 'var(--card-bg)',
                  opacity: isCompleted ? 0.7 : 1,
                }}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleComplete(date)}
                      className="transition-transform hover:scale-110"
                      aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" style={{ color: '#00843D' }} />
                      ) : (
                        <Circle className="h-5 w-5" style={{ color: 'var(--foreground-secondary)' }} />
                      )}
                    </button>
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {getDayLabel(date)}
                      </span>
                      {isToday && (
                        <span
                          className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ background: 'var(--accent-secondary)', color: '#fff' }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>

                  {isToday && items.length > 0 && !isCompleted && (
                    <button
                      onClick={() => handleStartStudy(items[0])}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
                      style={{ background: 'var(--accent-secondary)' }}
                    >
                      <Play className="h-3 w-3" />
                      Start Study
                    </button>
                  )}
                </div>

                {/* Day Content */}
                <div className="space-y-2 px-4 py-3">
                  {items.map((item, idx) => (
                    <DayCard key={`${date}-${idx}`} item={item} isCompleted={isCompleted} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Score Info */}
      <div
        className="rounded-xl border p-4 text-center"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Plan optimized for a <strong style={{ color: 'var(--accent-secondary)' }}>{plan.targetScore}%</strong> target score.
          Subjects with lower accuracy and higher exam weight get more study time.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--accent-secondary)' }}>
        {icon}
        <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--foreground-secondary)' }}>
          {label}
        </span>
      </div>
      <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
        {value}
      </p>
    </div>
  );
}

function DayCard({ item, isCompleted }: { item: DailyPlanItem; isCompleted: boolean }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: 'var(--card-border)',
        borderLeftWidth: '3px',
        borderLeftColor: getPriorityColor(item.priority),
        textDecoration: isCompleted ? 'line-through' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {item.subject}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: `${getTypeColor(item.type)}20`, color: getTypeColor(item.type) }}
          >
            {getTypeIcon(item.type)}
            {item.type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--foreground-secondary)' }}>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {item.questionTarget} Qs
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.estimatedMinutes} min
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {item.modules.map((mod, idx) => (
          <span
            key={idx}
            className="rounded-md px-2 py-0.5 text-[10px]"
            style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}
          >
            {mod}
          </span>
        ))}
      </div>
    </div>
  );
}
