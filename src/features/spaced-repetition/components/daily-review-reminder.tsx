'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Bell, X, ArrowRight } from 'lucide-react';
import { getDueCards } from '../utils/scheduler';
import { getScheduledCards, isReminderDismissedToday, dismissReminderToday } from '../utils/storage';
import { getFlashcards } from '@/features/flashcards/utils/storage';
import type { ScheduledCard } from '../types';

function getUnifiedCards(): ScheduledCard[] {
  const scheduled = getScheduledCards();
  const flashcards = getFlashcards();

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

export function DailyReviewReminder() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return isReminderDismissedToday();
  });

  const dueCount = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    const cards = getUnifiedCards();
    return getDueCards(cards).length;
  }, []);

  const handleDismiss = () => {
    dismissReminderToday();
    setDismissed(true);
  };

  // Don't show if dismissed or no cards due
  if (dismissed || dueCount === 0) return null;

  return (
    <div
      className="relative flex items-center gap-3 rounded-xl border px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300"
      style={{
        borderColor: 'rgba(197, 162, 88, 0.3)',
        background: 'linear-gradient(135deg, rgba(0, 43, 92, 0.05), rgba(197, 162, 88, 0.05))',
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'rgba(197, 162, 88, 0.15)' }}
      >
        <Bell className="h-4 w-4 text-[#C5A258]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Daily Review Reminder
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          You have {dueCount} card{dueCount !== 1 ? 's' : ''} due for review today.
          Consistent reviews boost long-term retention!
        </p>
      </div>

      <Link
        href="/review/session"
        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: '#C5A258', color: '#ffffff' }}
      >
        Review
        <ArrowRight className="h-3 w-3" />
      </Link>

      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-full p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        aria-label="Dismiss reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
