'use client';

import { useState, useCallback, useRef } from 'react';
import { Flame, Target, Clock } from 'lucide-react';
import type { Question } from '@/features/question-bank/types';
import type { PracticeRating, PracticeStats } from '../types';
import { loadAllQuestions } from '@/features/question-bank/utils/question-loader';
import { selectNextQuestion, updatePracticeHistory, setQuestionSubjectMap } from '../utils/practice-algorithm';
import {
  getPracticeStats,
  incrementPracticeCount,
  getDueTomorrowCount,
} from '../utils/practice-storage';
import { PracticeQuestionCard } from './practice-question-card';

const RATING_CONFIG: { rating: PracticeRating; label: string; color: string; bg: string }[] = [
  { rating: 'forgot', label: 'Forgot', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { rating: 'hard', label: 'Hard', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { rating: 'good', label: 'Good', color: '#00843D', bg: 'rgba(0, 132, 61, 0.15)' },
  { rating: 'easy', label: 'Easy', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
];

function initQuestions(): { questions: Question[]; firstQuestion: Question | null } {
  if (typeof window === 'undefined') return { questions: [], firstQuestion: null };
  const questions = loadAllQuestions();
  setQuestionSubjectMap(questions);
  const firstQuestion = selectNextQuestion(questions);
  return { questions, firstQuestion };
}

export function PracticeContent() {
  const [initialized] = useState(() => initQuestions());
  const questionsRef = useRef<Question[]>(initialized.questions);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(initialized.firstQuestion);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState<PracticeStats>(() => {
    if (typeof window === 'undefined') {
      return { date: '', count: 0, streakDays: 0, lastPracticeDate: '' };
    }
    return getPracticeStats();
  });
  const [dueTomorrow, setDueTomorrow] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return getDueTomorrowCount();
  });

  const handleReveal = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const handleRate = useCallback(
    (rating: PracticeRating) => {
      if (!currentQuestion) return;

      // Update practice history with the rating
      updatePracticeHistory(currentQuestion.id, rating);

      // Increment daily practice count
      const updatedStats = incrementPracticeCount();
      setStats(updatedStats);

      // Update due tomorrow count
      setDueTomorrow(getDueTomorrowCount());

      // Select next question
      setShowAnswer(false);
      const next = selectNextQuestion(questionsRef.current, currentQuestion.id);
      setCurrentQuestion(next);
    },
    [currentQuestion]
  );

  if (initialized.questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--accent-primary)' }}
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
        }}
      >
        <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>
          No questions available
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
          Import questions from the Question Bank to start practicing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div
        className="flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3 sm:gap-6 sm:px-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Practiced today:{' '}
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {stats.count}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
          <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Streak:{' '}
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {stats.streakDays} {stats.streakDays === 1 ? 'day' : 'days'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: 'var(--foreground-secondary)' }} />
          <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Due tomorrow:{' '}
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {dueTomorrow}
            </span>
          </span>
        </div>
      </div>

      {/* Question card */}
      <PracticeQuestionCard
        key={currentQuestion.id}
        question={currentQuestion}
        showAnswer={showAnswer}
        onReveal={handleReveal}
      />

      {/* Rating buttons (only shown after reveal) */}
      {showAnswer && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {RATING_CONFIG.map(({ rating, label, color, bg }) => (
            <button
              key={rating}
              onClick={() => handleRate(rating)}
              className="rounded-lg border px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                borderColor: color,
                backgroundColor: bg,
                color: color,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Hint text */}
      {!showAnswer && (
        <p className="text-center text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          Think about your answer, then reveal to check. Rate honestly for best results.
        </p>
      )}
    </div>
  );
}
