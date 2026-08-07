'use client';

import { useState, useCallback } from 'react';
import { RotateCw, CheckCircle2, Brain, Layers } from 'lucide-react';
import type { Flashcard, ReviewRating, FlashcardStats } from '../types';
import { reviewCard, getCardsDueToday, computeStats } from '../utils/sm2';
import { getFlashcards, updateFlashcard, getReviewedToday, incrementReviewedToday } from '../utils/storage';
import { useCursorPagination } from '@/shared/hooks/use-cursor-pagination';

export function FlashcardDeck() {
  const [cards, setCards] = useState<Flashcard[]>(() => getFlashcards());
  const [reviewedToday, setReviewedToday] = useState(() => getReviewedToday());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const dueCards = getCardsDueToday(cards);
  const stats: FlashcardStats = computeStats(cards, reviewedToday);
  const currentCard = dueCards[currentIdx] ?? null;

  const handleRate = useCallback((rating: ReviewRating) => {
    if (!currentCard) return;
    const updated = reviewCard(currentCard, rating);
    updateFlashcard(updated);
    incrementReviewedToday();
    setReviewedToday(prev => prev + 1);
    setCards(getFlashcards());
    setFlipped(false);
    setCurrentIdx(prev => Math.min(prev, getCardsDueToday(getFlashcards()).length - 1));
  }, [currentCard]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="rounded-xl border p-5 transition-all duration-200" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>
          Flashcard Overview
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={<Layers className="h-4 w-4" />} label="Total Cards" value={stats.total} />
          <StatCard icon={<RotateCw className="h-4 w-4" />} label="Due Today" value={stats.dueToday} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Mastered" value={stats.mastered} />
          <StatCard icon={<Brain className="h-4 w-4" />} label="Studied Today" value={stats.studiedToday} />
        </div>
      </div>

      {/* Card Display */}
      {currentCard ? (
        <div className="flex flex-col items-center">
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative w-full max-w-lg cursor-pointer rounded-2xl border p-8 min-h-[240px] flex items-center justify-center transition-all duration-300 hover:shadow-lg"
            style={{
              borderColor: 'var(--card-border)',
              background: flipped ? 'var(--background-tertiary)' : 'var(--card-bg)',
              transform: flipped ? 'rotateY(0deg)' : 'rotateY(0deg)',
            }}
          >
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--accent-secondary)' }}>
                {flipped ? 'Answer' : 'Question'}
              </p>
              <p className="text-base leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {flipped ? currentCard.back : currentCard.front}
              </p>
              {!flipped && (
                <p className="mt-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Click to reveal answer
                </p>
              )}
            </div>
          </div>

          {/* Rating Buttons */}
          {flipped && (
            <div className="mt-6 flex gap-3">
              {([
                { rating: 'again' as ReviewRating, label: 'Again', color: '#ef4444' },
                { rating: 'hard' as ReviewRating, label: 'Hard', color: '#f97316' },
                { rating: 'good' as ReviewRating, label: 'Good', color: '#00843D' },
                { rating: 'easy' as ReviewRating, label: 'Easy', color: '#002B5C' },
              ]).map(({ rating, label, color }) => (
                <button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: color }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {dueCards.length - currentIdx - 1} cards remaining
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--card-border)' }}>
          <Brain className="mx-auto h-12 w-12 opacity-30" style={{ color: 'var(--foreground-secondary)' }} />
          <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>No Flashcards Yet</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Complete a question session and create flashcards from your incorrect answers.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#00843D]" />
          <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>All Done!</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            You&apos;ve reviewed all cards due today. Come back tomorrow!
          </p>
        </div>
      )}

      {/* All Cards Browser with Pagination */}
      <CardBrowser cards={cards} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-1.5" style={{ color: 'var(--foreground-secondary)' }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
    </div>
  );
}

function CardBrowser({ cards }: { cards: Flashcard[] }) {
  const { visibleItems, hasMore, loadMore } = useCursorPagination({
    items: cards,
    pageSize: 20,
    getCursor: (card) => card.id,
  });

  if (cards.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
        All Cards ({cards.length})
      </h3>
      <div className="space-y-2">
        {visibleItems.map((card) => (
          <div
            key={card.id}
            className="rounded-lg border p-3 transition-colors"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--foreground)' }}>{card.front}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    card.state === 'mastered' ? 'bg-green-900/30 text-green-400' :
                    card.state === 'review' ? 'bg-blue-900/30 text-blue-400' :
                    card.state === 'learning' ? 'bg-orange-900/30 text-orange-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {card.state}
                  </span>
                  {card.subject && (
                    <span className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                      {card.subject}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                  EF: {card.easeFactor.toFixed(2)}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>
                  {card.interval}d interval
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="rounded-lg px-6 py-2.5 text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            Load More ({cards.length - visibleItems.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
