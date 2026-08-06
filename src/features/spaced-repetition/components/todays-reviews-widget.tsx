'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Brain, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { getDueCards, computeRetentionRate, getNextReviewDate } from '../utils/scheduler';
import { getScheduledCards, getTodayStats } from '../utils/storage';
import { getFlashcards, getReviewedToday } from '@/features/flashcards/utils/storage';
import type { ScheduledCard } from '../types';

/**
 * Syncs flashcards from the main flashcard store into the scheduled cards pool.
 * This ensures cards created in the flashcards feature are available for spaced repetition.
 */
function getUnifiedCards(): ScheduledCard[] {
  const scheduled = getScheduledCards();
  const flashcards = getFlashcards();

  // Merge flashcards not already in scheduled cards
  const scheduledIds = new Set(scheduled.map(c => c.id));
  for (const fc of flashcards) {
    if (!scheduledIds.has(fc.id)) {
      scheduled.push({
        id: fc.id,
        front: fc.front,
        back: fc.back,
        subject: fc.subject,
        topic: fc.topic,
        state: fc.state,
        easeFactor: fc.easeFactor,
        interval: fc.interval,
        repetitions: fc.repetitions,
        nextReview: fc.nextReview,
        lastReview: fc.lastReview,
        createdAt: fc.createdAt,
      });
    }
  }

  return scheduled;
}

export function TodaysReviewsWidget() {
  const [cards] = useState<ScheduledCard[]>(() => {
    if (typeof window === 'undefined') return [];
    return getUnifiedCards();
  });

  const dueCards = useMemo(() => getDueCards(cards), [cards]);
  const retentionRate = useMemo(() => computeRetentionRate(cards), [cards]);

  const todayStats = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getTodayStats();
  }, []);

  const reviewedToday = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    return todayStats?.cardsReviewed ?? getReviewedToday();
  }, [todayStats]);

  // Find next review time for non-due cards
  const nextReviewText = useMemo(() => {
    if (dueCards.length > 0) return null;
    const upcoming = cards
      .filter(c => c.state !== 'mastered' && c.nextReview > new Date().toISOString())
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
    if (upcoming.length === 0) return 'No upcoming reviews';
    return getNextReviewDate(upcoming[0]);
  }, [cards, dueCards]);

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full p-2" style={{ background: 'rgba(0, 43, 92, 0.1)' }}>
            <Brain className="h-5 w-5 text-[#002B5C]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Today&apos;s Reviews
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Create flashcards to start your spaced repetition schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--background-secondary)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2" style={{ background: 'rgba(0, 43, 92, 0.1)' }}>
            <Brain className="h-5 w-5 text-[#002B5C]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Today&apos;s Reviews
          </h3>
        </div>
        {dueCards.length > 0 && (
          <Link
            href="/review/session"
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: '#002B5C', color: '#C5A258' }}
          >
            Start
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox
          label="Due Today"
          value={dueCards.length.toString()}
          highlight={dueCards.length > 0}
        />
        <StatBox
          label="Reviewed"
          value={reviewedToday.toString()}
          highlight={false}
        />
        <StatBox
          label="Retention"
          value={retentionRate > 0 ? `${retentionRate}%` : '--'}
          highlight={false}
        />
        <StatBox
          label="Next Review"
          value={nextReviewText ?? 'Now'}
          highlight={false}
          small
        />
      </div>

      {dueCards.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Clock className="h-3 w-3" />
          <span>~{Math.max(1, Math.ceil(dueCards.length * 0.5))} min estimated</span>
        </div>
      )}

      {dueCards.length === 0 && reviewedToday > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#00843D]">
          <CheckCircle2 className="h-3 w-3" />
          <span>All caught up! Great work today.</span>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string;
  highlight: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-[var(--border-primary)] p-2">
      <span
        className={`font-bold ${small ? 'text-xs' : 'text-lg'} ${highlight ? 'text-[#C5A258]' : 'text-[var(--text-primary)]'}`}
      >
        {value}
      </span>
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}
