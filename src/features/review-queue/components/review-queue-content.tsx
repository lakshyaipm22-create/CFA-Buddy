'use client';

import { useState, useMemo, useCallback } from 'react';
import { ListChecks, Clock, Play, ChevronRight, RotateCcw, CheckCircle2, BookOpen } from 'lucide-react';
import { buildReviewQueue } from '../utils/queue-builder';
import { ReviewCelebration } from './review-celebration';
import { reviewCard } from '@/features/flashcards/utils/sm2';
import { updateFlashcard, incrementReviewedToday } from '@/features/flashcards/utils/storage';
import type { Flashcard, ReviewRating } from '@/features/flashcards/types';
import type { Question } from '@/features/question-bank/types';

const COMPLETION_KEY = 'cfa-buddy-review-completion';

function getCompletionToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(COMPLETION_KEY);
    if (!raw) return false;
    const { date } = JSON.parse(raw);
    return date === new Date().toISOString().split('T')[0];
  } catch {
    return false;
  }
}

function markCompletionToday(stats: { itemsCompleted: number; timeSpentSeconds: number; questionsCorrect: number; questionsTotal: number }): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(COMPLETION_KEY, JSON.stringify({ date: today, ...stats }));
}

export function ReviewQueueContent() {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(() => getCompletionToday());
  const [startTime] = useState(() => typeof window !== 'undefined' ? performance.now() : 0);
  const [completionTimeSpent, setCompletionTimeSpent] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [questionsTotal, setQuestionsTotal] = useState(0);

  // Flashcard state
  const [flipped, setFlipped] = useState(false);

  // Question state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  const queueData = useMemo(() => buildReviewQueue(), []);
  const { items, estimatedMinutes } = queueData;

  const currentItem = items[currentIndex] ?? null;

  const handleStart = useCallback(() => {
    setStarted(true);
    setCurrentIndex(0);
    setFlipped(false);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
  }, []);

  const advanceToNext = useCallback(() => {
    if (currentIndex >= items.length - 1) {
      // All done
      const timeSpent = Math.round((performance.now() - startTime) / 1000);
      const stats = {
        itemsCompleted: items.length,
        timeSpentSeconds: timeSpent,
        questionsCorrect,
        questionsTotal,
      };
      markCompletionToday(stats);
      setCompletionTimeSpent(timeSpent);
      setCompleted(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
      setSelectedAnswer(null);
      setAnswerRevealed(false);
    }
  }, [currentIndex, items.length, startTime, questionsCorrect, questionsTotal]);

  // Flashcard handlers
  const handleFlipCard = useCallback(() => {
    setFlipped(true);
  }, []);

  const handleRateFlashcard = useCallback((rating: ReviewRating) => {
    if (!currentItem || currentItem.type !== 'flashcard') return;
    const card = currentItem.data as Flashcard;
    const updated = reviewCard(card, rating);
    updateFlashcard(updated);
    incrementReviewedToday();
    advanceToNext();
  }, [currentItem, advanceToNext]);

  // Question handlers
  const handleSelectAnswer = useCallback((label: string) => {
    if (answerRevealed) return;
    setSelectedAnswer(label);
  }, [answerRevealed]);

  const handleRevealAnswer = useCallback(() => {
    if (!selectedAnswer || !currentItem) return;
    setAnswerRevealed(true);
    const question = currentItem.data as Question;
    const correctChoice = question.answerChoices.find(c => c.isCorrect);
    const isCorrect = correctChoice?.label === selectedAnswer;
    setQuestionsTotal(prev => prev + 1);
    if (isCorrect) setQuestionsCorrect(prev => prev + 1);
  }, [selectedAnswer, currentItem]);

  // Revision handler
  const handleMarkRevisionDone = useCallback(() => {
    advanceToNext();
  }, [advanceToNext]);

  // Completed state (already done today)
  if (completed && !started) {
    return (
      <ReviewCelebration
        itemsCompleted={items.length || 1}
        timeSpentSeconds={completionTimeSpent}
        questionsCorrect={questionsCorrect}
        questionsTotal={questionsTotal}
      />
    );
  }

  // Completed state (just finished)
  if (completed && started) {
    return (
      <ReviewCelebration
        itemsCompleted={items.length}
        timeSpentSeconds={completionTimeSpent}
        questionsCorrect={questionsCorrect}
        questionsTotal={questionsTotal}
      />
    );
  }

  // Empty queue
  if (items.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="rounded-full p-4" style={{ background: 'rgba(0, 132, 61, 0.1)' }}>
          <CheckCircle2 className="h-12 w-12" style={{ color: '#00843D' }} />
        </div>
        <h2 className="mt-4 text-xl font-bold" style={{ color: 'var(--foreground)' }}>
          All caught up!
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          No items due for review right now. Keep studying and check back later.
        </p>
      </div>
    );
  }

  // Queue summary (not started yet)
  if (!started) {
    const flashcardCount = items.filter(i => i.type === 'flashcard').length;
    const questionCount = items.filter(i => i.type === 'question').length;
    const revisionCount = items.filter(i => i.type === 'revision').length;

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
          <ListChecks className="mx-auto h-10 w-10" style={{ color: 'var(--accent-primary)' }} />
          <h2 className="mt-4 text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            Daily Review Queue
          </h2>
          <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
            {items.length} items
          </p>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            <Clock className="h-3.5 w-3.5" />
            <span>~{estimatedMinutes} minutes</span>
          </div>

          {/* Breakdown */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {flashcardCount > 0 && (
              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-lg font-bold" style={{ color: '#C5A258' }}>{flashcardCount}</p>
                <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>Flashcards</p>
              </div>
            )}
            {questionCount > 0 && (
              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-lg font-bold" style={{ color: '#002B5C' }}>{questionCount}</p>
                <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>Questions</p>
              </div>
            )}
            {revisionCount > 0 && (
              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-lg font-bold" style={{ color: '#00843D' }}>{revisionCount}</p>
                <p className="text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>Revision</p>
              </div>
            )}
          </div>

          <button
            onClick={handleStart}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: 'var(--accent-primary)', color: '#ffffff' }}
          >
            <Play className="h-4 w-4" />
            Start Review
          </button>
        </div>
      </div>
    );
  }

  // Active review
  if (!currentItem) return null;

  const progress = ((currentIndex + 1) / items.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          {currentIndex + 1} / {items.length}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--nav-hover-bg)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: 'var(--accent-primary)' }}
          />
        </div>
        <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
          {currentItem.type}
        </span>
      </div>

      {/* Item Card */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
        {/* Subject badge */}
        <p className="text-[10px] font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--accent-primary)' }}>
          {currentItem.subject}
        </p>

        {/* Flashcard */}
        {currentItem.type === 'flashcard' && (
          <FlashcardReview
            card={currentItem.data as Flashcard}
            flipped={flipped}
            onFlip={handleFlipCard}
            onRate={handleRateFlashcard}
          />
        )}

        {/* Question */}
        {currentItem.type === 'question' && (
          <QuestionReview
            question={currentItem.data as Question}
            selectedAnswer={selectedAnswer}
            answerRevealed={answerRevealed}
            onSelectAnswer={handleSelectAnswer}
            onRevealAnswer={handleRevealAnswer}
            onNext={advanceToNext}
          />
        )}

        {/* Revision */}
        {currentItem.type === 'revision' && (
          <RevisionReview
            subject={currentItem.subject}
            onDone={handleMarkRevisionDone}
          />
        )}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function FlashcardReview({
  card,
  flipped,
  onFlip,
  onRate,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  onRate: (rating: ReviewRating) => void;
}) {
  return (
    <div>
      <div
        className="min-h-[120px] cursor-pointer rounded-lg border p-4 text-center flex items-center justify-center"
        style={{ borderColor: 'var(--card-border)' }}
        onClick={!flipped ? onFlip : undefined}
      >
        <p className="text-sm" style={{ color: 'var(--foreground)' }}>
          {flipped ? card.back : card.front}
        </p>
      </div>

      {!flipped && (
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Tap to reveal answer
        </p>
      )}

      {flipped && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(['again', 'hard', 'good', 'easy'] as const).map((rating) => (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              className="rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors hover:opacity-80"
              style={{
                borderColor: 'var(--card-border)',
                color: rating === 'again' ? '#ef4444' : rating === 'hard' ? '#C5A258' : rating === 'good' ? '#00843D' : '#002B5C',
              }}
            >
              {rating}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionReview({
  question,
  selectedAnswer,
  answerRevealed,
  onSelectAnswer,
  onRevealAnswer,
  onNext,
}: {
  question: Question;
  selectedAnswer: string | null;
  answerRevealed: boolean;
  onSelectAnswer: (label: string) => void;
  onRevealAnswer: () => void;
  onNext: () => void;
}) {
  const correctChoice = question.answerChoices.find(c => c.isCorrect);

  return (
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
        {question.questionText}
      </p>

      <div className="mt-4 space-y-2">
        {question.answerChoices.map((choice) => {
          let borderColor = 'var(--card-border)';
          let bg = 'transparent';

          if (answerRevealed) {
            if (choice.isCorrect) {
              borderColor = '#00843D';
              bg = 'rgba(0, 132, 61, 0.1)';
            } else if (choice.label === selectedAnswer && !choice.isCorrect) {
              borderColor = '#ef4444';
              bg = 'rgba(239, 68, 68, 0.1)';
            }
          } else if (choice.label === selectedAnswer) {
            borderColor = 'var(--accent-primary)';
            bg = 'rgba(197, 162, 88, 0.1)';
          }

          return (
            <button
              key={choice.label}
              onClick={() => onSelectAnswer(choice.label)}
              className="flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-all"
              style={{ borderColor, background: bg }}
              disabled={answerRevealed}
            >
              <span className="font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                {choice.label}.
              </span>
              <span style={{ color: 'var(--foreground)' }}>{choice.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation after reveal */}
      {answerRevealed && correctChoice && (
        <div className="mt-4 rounded-lg border p-3" style={{ borderColor: 'rgba(0, 132, 61, 0.3)', background: 'rgba(0, 132, 61, 0.05)' }}>
          <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {correctChoice.explanation}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-end">
        {!answerRevealed ? (
          <button
            onClick={onRevealAnswer}
            disabled={!selectedAnswer}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent-primary)', color: '#ffffff' }}
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--accent-primary)', color: '#ffffff' }}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function RevisionReview({
  subject,
  onDone,
}: {
  subject: string;
  onDone: () => void;
}) {
  return (
    <div className="text-center">
      <BookOpen className="mx-auto h-10 w-10" style={{ color: 'var(--accent-primary)' }} />
      <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        Revision: {subject}
      </h3>
      <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
        Take a few minutes to review key concepts, formulas, and your notes for this subject.
        Focus on areas where you have previously made mistakes.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={onDone}
          className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors hover:opacity-90"
          style={{ background: '#00843D', color: '#ffffff' }}
        >
          <RotateCcw className="h-4 w-4" />
          Mark as Reviewed
        </button>
      </div>
    </div>
  );
}
