'use client';

import { useState } from 'react';
import { Layers, RotateCw, CheckCircle2, Brain, TrendingUp } from 'lucide-react';
import type { FlashcardStats as FlashcardStatsType } from '../types';
import { getFlashcards, getReviewedToday } from '../utils/storage';
import { computeStats } from '../utils/sm2';

export function FlashcardStats() {
  const [stats] = useState<FlashcardStatsType>(() => {
    const cards = getFlashcards();
    const reviewedToday = getReviewedToday();
    return computeStats(cards, reviewedToday);
  });

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
        Flashcard Statistics
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatItem
          icon={<Layers className="h-4 w-4" />}
          label="Total Cards"
          value={String(stats.total)}
          color="var(--foreground)"
        />
        <StatItem
          icon={<RotateCw className="h-4 w-4" />}
          label="Due Today"
          value={String(stats.dueToday)}
          color="#C5A258"
        />
        <StatItem
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Mastered"
          value={String(stats.mastered)}
          color="#00843D"
        />
        <StatItem
          icon={<TrendingUp className="h-4 w-4" />}
          label="Retention"
          value={`${stats.retention}%`}
          color="#002B5C"
        />
        <StatItem
          icon={<Brain className="h-4 w-4" />}
          label="Studied Today"
          value={String(stats.studiedToday)}
          color="var(--foreground)"
        />
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-1.5" style={{ color: 'var(--foreground-secondary)' }}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
