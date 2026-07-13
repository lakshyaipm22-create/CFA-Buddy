'use client';

import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  streakDays: number;
  dailyCounts: Record<string, number>;
}

export function StreakDisplay({ streakDays, dailyCounts }: StreakDisplayProps) {
  // Generate last 7 days
  const days = getLast7Days();

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5">
      <div className="flex items-center gap-2">
        <Flame className={`h-4 w-4 ${streakDays > 0 ? 'text-[#C5A258]' : 'text-[var(--text-muted)]'}`} />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Study Streak</h3>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-bold text-[#C5A258]">{streakDays}</span>
        <span className="text-sm text-[var(--text-secondary)]">
          {streakDays === 1 ? 'day' : 'days'}
        </span>
      </div>
      {/* 7-day activity dots */}
      <div className="mt-4 flex items-center gap-2">
        {days.map(({ dateStr, label }) => {
          const count = dailyCounts[dateStr] ?? 0;
          const active = count >= 10;
          return (
            <div key={dateStr} className="flex flex-col items-center gap-1">
              <div
                className={`h-3 w-3 rounded-full transition-colors ${
                  active
                    ? 'bg-[#C5A258]'
                    : count > 0
                      ? 'bg-[#C5A258]/30'
                      : 'bg-[var(--border-primary)]'
                }`}
              />
              <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-muted)]">
        {streakDays > 0
          ? `Keep going! Answer 10+ questions daily to maintain your streak.`
          : `Answer 10+ questions today to start a streak!`}
      </p>
    </div>
  );
}

function getLast7Days(): Array<{ dateStr: string; label: string }> {
  const days: Array<{ dateStr: string; label: string }> = [];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const label = dayNames[date.getDay()];
    days.push({ dateStr, label });
  }

  return days;
}
