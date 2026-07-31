'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAttemptById, saveAttempt } from '../utils/attempt-storage';
import { corporateIssuersQuestions } from '../data/corporate-issuers';
import type { PracticeAttempt } from '../types/attempt';
import type { Question } from '../types';

interface AttemptReviewProps {
  attemptId: string;
}

type FilterMode = 'all' | 'incorrect' | 'bookmarked';

export function AttemptReview({ attemptId }: AttemptReviewProps) {
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(() => getAttemptById(attemptId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterMode>('all');

  const allQuestionAttempts = useMemo(() => {
    if (!attempt) return [];
    return attempt.moduleResults.flatMap(m => m.questionAttempts);
  }, [attempt]);

  const filteredAttempts = useMemo(() => {
    switch (filter) {
      case 'incorrect':
        return allQuestionAttempts.filter(qa => !qa.correct);
      case 'bookmarked':
        return allQuestionAttempts.filter(qa => attempt?.bookmarkedIds.includes(qa.questionId));
      default:
        return allQuestionAttempts;
    }
  }, [allQuestionAttempts, filter, attempt]);

  const currentAttemptQ = filteredAttempts[currentIndex];
  const currentQuestion: Question | undefined = currentAttemptQ
    ? corporateIssuersQuestions.find(q => q.id === currentAttemptQ.questionId)
    : undefined;

  const isBookmarked = currentAttemptQ
    ? attempt?.bookmarkedIds.includes(currentAttemptQ.questionId) ?? false
    : false;

  const toggleBookmark = useCallback(() => {
    if (!attempt || !currentAttemptQ) return;
    const qid = currentAttemptQ.questionId;
    const updated = { ...attempt };
    if (updated.bookmarkedIds.includes(qid)) {
      updated.bookmarkedIds = updated.bookmarkedIds.filter(id => id !== qid);
    } else {
      updated.bookmarkedIds = [...updated.bookmarkedIds, qid];
    }
    saveAttempt(updated);
    setAttempt(updated);
  }, [attempt, currentAttemptQ]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < filteredAttempts.length) {
      setCurrentIndex(index);
    }
  }, [filteredAttempts.length]);

  const handleFilterChange = useCallback((newFilter: FilterMode) => {
    setFilter(newFilter);
    setCurrentIndex(0);
  }, []);

  if (!attempt) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Attempt not found.</p>
      </div>
    );
  }

  if (filteredAttempts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <Link
          href={`/questions/attempts/${attemptId}`}
          className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex h-[300px] items-center justify-center">
          <p style={{ color: 'var(--foreground-secondary)' }}>
            No questions match the current filter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-12 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/questions/attempts/${attemptId}`}
          className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <span className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          {currentIndex + 1} of {filteredAttempts.length}
        </span>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'incorrect', 'bookmarked'] as FilterMode[]).map(f => {
          const isActive = filter === f;
          const label = f === 'all' ? 'All' : f === 'incorrect' ? 'Incorrect Only' : 'Bookmarked Only';
          const count = f === 'all'
            ? allQuestionAttempts.length
            : f === 'incorrect'
              ? allQuestionAttempts.filter(qa => !qa.correct).length
              : attempt.bookmarkedIds.length;

          return (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--card-bg)',
                color: isActive ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
                border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--card-border)'}`,
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Question Number Pills */}
      <div className="flex flex-wrap gap-1.5">
        {filteredAttempts.map((qa, idx) => {
          const isActive = idx === currentIndex;
          const bgColor = isActive
            ? 'var(--accent-primary)'
            : qa.correct
              ? 'rgba(0, 132, 61, 0.15)'
              : 'rgba(239, 68, 68, 0.15)';
          const txtColor = isActive
            ? 'var(--accent-secondary)'
            : qa.correct
              ? 'var(--accent-success)'
              : '#ef4444';

          return (
            <button
              key={`${qa.questionId}-${idx}`}
              onClick={() => goToQuestion(idx)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: bgColor, color: txtColor }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      {currentQuestion && currentAttemptQ && (
        <div
          className="rounded-2xl p-5 md:p-6"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          {/* Question Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: currentAttemptQ.correct ? 'rgba(0, 132, 61, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: currentAttemptQ.correct ? 'var(--accent-success)' : '#ef4444',
                }}
              >
                {currentAttemptQ.correct ? 'Correct' : 'Incorrect'}
              </span>
              {currentQuestion.topic && (
                <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  {currentQuestion.topic}
                </span>
              )}
            </div>
            <button
              onClick={toggleBookmark}
              className="rounded-lg p-2 transition-all hover:opacity-80"
              style={{
                backgroundColor: isBookmarked ? 'rgba(197, 162, 88, 0.15)' : 'transparent',
              }}
              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Star
                className="h-5 w-5"
                style={{
                  color: isBookmarked ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
                  fill: isBookmarked ? 'var(--accent-secondary)' : 'none',
                }}
              />
            </button>
          </div>

          {/* Question Text */}
          <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
            {currentQuestion.questionText}
          </p>

          {/* Answer Choices */}
          <div className="space-y-3">
            {currentQuestion.answerChoices.map(choice => {
              const isSelected = choice.label === currentAttemptQ.selectedAnswer;
              const isCorrect = choice.isCorrect;

              let borderColor = 'var(--card-border)';
              let bgColor = 'transparent';

              if (isCorrect) {
                borderColor = 'var(--accent-success)';
                bgColor = 'rgba(0, 132, 61, 0.08)';
              } else if (isSelected && !isCorrect) {
                borderColor = '#ef4444';
                bgColor = 'rgba(239, 68, 68, 0.08)';
              }

              return (
                <div
                  key={choice.label}
                  className="rounded-lg px-4 py-3 text-sm transition-all"
                  style={{
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bgColor,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      {choice.label}.
                    </span>
                    <span style={{ color: 'var(--foreground)' }}>{choice.text}</span>
                    {isCorrect && (
                      <span className="ml-auto text-sm" style={{ color: 'var(--accent-success)' }}>&#10003;</span>
                    )}
                    {isSelected && !isCorrect && (
                      <span className="ml-auto text-sm" style={{ color: '#ef4444' }}>&#10007;</span>
                    )}
                  </div>
                  {/* Explanation always visible in review mode */}
                  <p
                    className="mt-2 text-xs leading-relaxed"
                    style={{ color: 'var(--foreground-secondary)', opacity: 0.9 }}
                  >
                    {choice.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToQuestion(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          onClick={() => goToQuestion(currentIndex + 1)}
          disabled={currentIndex >= filteredAttempts.length - 1}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
