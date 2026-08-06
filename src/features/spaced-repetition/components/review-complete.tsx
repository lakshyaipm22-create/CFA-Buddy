'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight, BarChart3, Trophy } from 'lucide-react';
import type { ReviewRating } from '../types';

interface ReviewCompleteProps {
  cardsReviewed: number;
  ratings: Record<ReviewRating, number>;
  onRestart: () => void;
}

export function ReviewComplete({ cardsReviewed, ratings, onRestart }: ReviewCompleteProps) {
  const correct = ratings.good + ratings.easy;
  const accuracy = cardsReviewed > 0 ? Math.round((correct / cardsReviewed) * 100) : 0;

  return (
    <div className="flex flex-col items-center text-center">
      {/* Success Icon */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: 'rgba(0, 132, 61, 0.1)' }}
      >
        <Trophy className="h-10 w-10 text-[#00843D]" />
      </div>

      <h2 className="text-2xl font-bold text-[var(--text-primary)]">
        Review Complete!
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        You reviewed {cardsReviewed} card{cardsReviewed !== 1 ? 's' : ''} in this session.
      </p>

      {/* Stats Grid */}
      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--background-secondary)] p-4">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle2 className="h-4 w-4 text-[#00843D]" />
            <span className="text-xs text-[var(--text-muted)]">Accuracy</span>
          </div>
          <p className="text-2xl font-bold text-[#00843D]">{accuracy}%</p>
        </div>
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--background-secondary)] p-4">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <BarChart3 className="h-4 w-4 text-[#C5A258]" />
            <span className="text-xs text-[var(--text-muted)]">Cards</span>
          </div>
          <p className="text-2xl font-bold text-[#C5A258]">{cardsReviewed}</p>
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="mt-4 w-full max-w-sm rounded-lg border border-[var(--border-primary)] bg-[var(--background-secondary)] p-4">
        <h4 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Rating Breakdown</h4>
        <div className="grid grid-cols-4 gap-2">
          <RatingCount label="Again" count={ratings.again} color="#ef4444" />
          <RatingCount label="Hard" count={ratings.hard} color="#f59e0b" />
          <RatingCount label="Good" count={ratings.good} color="#00843D" />
          <RatingCount label="Easy" count={ratings.easy} color="#002B5C" />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        {/* If there are more cards, offer restart */}
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: '#002B5C', color: '#C5A258' }}
        >
          Review Again
          <ArrowRight className="h-4 w-4" />
        </button>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-primary)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--background-secondary)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function RatingCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-bold" style={{ color }}>{count}</span>
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}
