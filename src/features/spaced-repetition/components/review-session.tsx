'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { getDueCards, scheduleReview } from '../utils/scheduler';
import {
  getScheduledCards,
  updateScheduledCard,
  saveReviewSession,
  addReviewHistory,
  updateDailyStats,
} from '../utils/storage';
import { getFlashcards, updateFlashcard, incrementReviewedToday } from '@/features/flashcards/utils/storage';
import { reviewCard } from '@/features/flashcards/utils/sm2';
import { ReviewComplete } from './review-complete';
import type { ScheduledCard, ReviewRating, ReviewSession as ReviewSessionType } from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Merge flashcards into scheduled cards pool for review.
 */
function getUnifiedDueCards(): ScheduledCard[] {
  const scheduled = getScheduledCards();
  const flashcards = getFlashcards();

  const scheduledIds = new Set(scheduled.map(c => c.id));
  const allCards: ScheduledCard[] = [...scheduled];

  for (const fc of flashcards) {
    if (!scheduledIds.has(fc.id)) {
      allCards.push({
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

  return getDueCards(allCards);
}

export function ReviewSessionContent() {
  const router = useRouter();

  const [dueCards] = useState<ScheduledCard[]>(() => {
    if (typeof window === 'undefined') return [];
    return getUnifiedDueCards();
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [ratings, setRatings] = useState<Record<ReviewRating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const sessionId = useMemo(() => generateId(), []);
  const currentCard = dueCards[currentIndex] ?? null;
  const totalCards = dueCards.length;
  const progress = totalCards > 0 ? Math.round((currentIndex / totalCards) * 100) : 0;

  const handleFlip = useCallback(() => {
    setFlipped(true);
  }, []);

  const handleRate = useCallback((rating: ReviewRating) => {
    if (!currentCard) return;

    // Update the scheduled card
    const updatedCard = scheduleReview(currentCard, rating);
    updateScheduledCard(updatedCard);

    // Also update in flashcards storage if it exists there
    const flashcards = getFlashcards();
    const flashcard = flashcards.find(f => f.id === currentCard.id);
    if (flashcard) {
      const updatedFlashcard = reviewCard(flashcard, rating as Parameters<typeof reviewCard>[1]);
      updateFlashcard(updatedFlashcard);
      incrementReviewedToday();
    }

    // Record review history
    addReviewHistory({
      cardId: currentCard.id,
      rating,
      reviewedAt: new Date().toISOString(),
      previousInterval: currentCard.interval,
      newInterval: updatedCard.interval,
    });

    // Update daily stats
    updateDailyStats(rating, updatedCard.easeFactor, sessionId);

    // Update ratings count
    setRatings(prev => ({ ...prev, [rating]: prev[rating] + 1 }));

    // Move to next card or complete
    if (currentIndex + 1 >= totalCards) {
      // Save session
      const session: ReviewSessionType = {
        id: sessionId,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        cardsReviewed: totalCards,
        ratings: { ...ratings, [rating]: ratings[rating] + 1 },
        averageEaseFactor: updatedCard.easeFactor,
      };
      saveReviewSession(session);
      setCompleted(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
    }
  }, [currentCard, currentIndex, totalCards, ratings, sessionId]);

  const handleRestart = useCallback(() => {
    // Reload due cards and restart
    const newDueCards = getUnifiedDueCards();
    if (newDueCards.length === 0) {
      router.push('/dashboard');
      return;
    }
    // Reset state - redirect to reload the page
    window.location.reload();
  }, [router]);

  const handleBack = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  // No cards due
  if (dueCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgba(0, 132, 61, 0.1)' }}
        >
          <RotateCcw className="h-8 w-8 text-[#00843D]" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          No Cards Due
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          All your cards are up to date. Check back later!
        </p>
        <button
          onClick={handleBack}
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: '#002B5C', color: '#C5A258' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Session complete
  if (completed) {
    return (
      <ReviewComplete
        cardsReviewed={totalCards}
        ratings={ratings}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            Card {currentIndex + 1} of {totalCards}
          </span>
          <span className="text-xs font-medium text-[#C5A258]">
            {progress}% complete
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--card-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(to right, #002B5C, #C5A258)',
            }}
          />
        </div>
      </div>

      {/* Subject/Topic Badge */}
      {currentCard && (
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: 'rgba(0, 43, 92, 0.1)', color: '#002B5C' }}
          >
            {currentCard.subject}
          </span>
          {currentCard.topic && (
            <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              {currentCard.topic}
            </span>
          )}
        </div>
      )}

      {/* Card */}
      {currentCard && (
        <div
          className="relative min-h-[280px] cursor-pointer rounded-xl border p-6 transition-all duration-300 hover:shadow-lg"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          onClick={!flipped ? handleFlip : undefined}
        >
          {!flipped ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-wide text-[#C5A258] mb-4">Question</p>
              <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
                {currentCard.front}
              </p>
              <p className="mt-6 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Tap to reveal answer
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-wide text-[#00843D] mb-4">Answer</p>
              <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
                {currentCard.back}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rating Buttons */}
      {flipped && (
        <div className="mt-6">
          <p className="mb-3 text-center text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            How well did you recall this?
          </p>
          <div className="grid grid-cols-4 gap-2">
            <RatingButton
              label="Again"
              sublabel="< 1 min"
              color="#ef4444"
              onClick={() => handleRate('again')}
            />
            <RatingButton
              label="Hard"
              sublabel="< 6 min"
              color="#f59e0b"
              onClick={() => handleRate('hard')}
            />
            <RatingButton
              label="Good"
              sublabel="> 1 day"
              color="#00843D"
              onClick={() => handleRate('good')}
            />
            <RatingButton
              label="Easy"
              sublabel="> 4 days"
              color="#002B5C"
              onClick={() => handleRate('easy')}
            />
          </div>
        </div>
      )}

      {/* Flip prompt for unflipped state */}
      {!flipped && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleFlip}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: '#002B5C', color: '#C5A258' }}
          >
            <RotateCcw className="h-4 w-4" />
            Show Answer
          </button>
        </div>
      )}
    </div>
  );
}

function RatingButton({
  label,
  sublabel,
  color,
  onClick,
}: {
  label: string;
  sublabel: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded-lg border p-3 transition-all hover:shadow-md"
      style={{ borderColor: `${color}30` }}
    >
      <span className="text-sm font-semibold" style={{ color }}>
        {label}
      </span>
      <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>{sublabel}</span>
    </button>
  );
}
