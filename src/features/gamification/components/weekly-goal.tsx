'use client';

import { Target } from 'lucide-react';

interface WeeklyGoalProps {
  current: number;
  target: number;
}

export function WeeklyGoal({ current, target }: WeeklyGoalProps) {
  const progress = Math.min(current / target, 1);
  const percentage = Math.round(progress * 100);

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-[#00843D]" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Weekly Goal</h3>
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--foreground)' }}>
        Answer {target} questions this week
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full"
          style={{ background: 'var(--card-border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${percentage}%`,
              background:
                progress >= 1
                  ? 'linear-gradient(90deg, #00843D, #00A84D)'
                  : 'linear-gradient(90deg, #C5A258, #E8D5A3)',
            }}
          />
        </div>
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
          {current}/{target}
        </span>
      </div>
      {progress >= 1 && (
        <p className="mt-2 text-xs font-medium text-[#00843D]">Goal completed this week!</p>
      )}
    </div>
  );
}
