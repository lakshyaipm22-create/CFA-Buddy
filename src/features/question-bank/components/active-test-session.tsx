'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuestionAttempt, QuestionSession, Confidence } from '../types';
import { getSession, saveSession } from '../utils/session-storage';
import { sampleQuestions } from '../data/sample-questions';
import { selectQuestions } from '../utils/question-selector';
import { Bookmark, Flag, StickyNote } from 'lucide-react';

interface ActiveTestSessionProps {
  sessionId: string;
}

/**
 * Load the session and questions from localStorage.
 * Called as lazy initializer for useState (runs once on mount).
 */
function loadSessionData(sessionId: string): { session: QuestionSession; questions: Question[] } | null {
  if (typeof window === 'undefined') return null;

  const loaded = getSession(sessionId);
  if (!loaded) return null;

  if (loaded.questionIds.length === 0) {
    const selected = selectQuestions(sampleQuestions, loaded.mode, loaded.config);
    if (selected.length === 0) return null;
    loaded.questionIds = selected.map(q => q.id);
    saveSession(loaded);
    return { session: loaded, questions: selected };
  }

  const questions = sampleQuestions.filter(q => loaded.questionIds.includes(q.id));
  return { session: loaded, questions };
}

export function ActiveTestSession({ sessionId }: ActiveTestSessionProps) {
  const router = useRouter();

  const [data] = useState(() => loadSessionData(sessionId));
  const [session, setSession] = useState<QuestionSession | null>(data?.session ?? null);
  const [questions] = useState<Question[]>(data?.questions ?? []);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [scratchpad, setScratchpad] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [questionStartMs, setQuestionStartMs] = useState(() => Date.now());

  const currentQuestion = session && questions.length > 0
    ? questions.find(q => q.id === session.questionIds[session.currentIndex]) ?? null
    : null;

  const submitAnswer = useCallback((confidence: Confidence) => {
    if (!session || !currentQuestion || !selectedAnswer) return;

    const timeSpent = Math.round((Date.now() - questionStartMs) / 1000);
    const correctChoice = currentQuestion.answerChoices.find(c => c.isCorrect);
    const isCorrect = correctChoice?.label === selectedAnswer;

    const attempt: QuestionAttempt = {
      questionId: currentQuestion.id,
      selectedAnswer,
      confidence,
      timeSpentSeconds: timeSpent,
      correct: isCorrect,
      timestamp: new Date().toISOString(),
    };

    const updatedSession: QuestionSession = {
      ...session,
      attempts: [...session.attempts, attempt],
      currentIndex: session.currentIndex + 1,
    };

    if (updatedSession.currentIndex >= updatedSession.questionIds.length) {
      updatedSession.status = 'completed';
      updatedSession.completedAt = new Date().toISOString();
    }

    saveSession(updatedSession);
    setSession(updatedSession);
    setSelectedAnswer(null);
    setQuestionStartMs(Date.now());

    if (updatedSession.status === 'completed') {
      router.push(`/questions/review/${sessionId}`);
    }
  }, [session, currentQuestion, selectedAnswer, sessionId, router, questionStartMs]);

  const toggleFlag = useCallback(() => {
    if (!session || !currentQuestion) return;
    const flagged = session.flaggedIds.includes(currentQuestion.id)
      ? session.flaggedIds.filter(id => id !== currentQuestion.id)
      : [...session.flaggedIds, currentQuestion.id];
    const updated = { ...session, flaggedIds: flagged };
    saveSession(updated);
    setSession(updated);
  }, [session, currentQuestion]);

  const toggleBookmark = useCallback(() => {
    if (!session || !currentQuestion) return;
    const bookmarked = session.bookmarkedIds.includes(currentQuestion.id)
      ? session.bookmarkedIds.filter(id => id !== currentQuestion.id)
      : [...session.bookmarkedIds, currentQuestion.id];
    const updated = { ...session, bookmarkedIds: bookmarked };
    saveSession(updated);
    setSession(updated);
  }, [session, currentQuestion]);

  const updateScratchpad = useCallback((value: string) => {
    setScratchpad(value);
    if (session) {
      localStorage.setItem(`scratch-${sessionId}-${session.currentIndex}`, value);
    }
  }, [session, sessionId]);

  if (!session || !currentQuestion) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-[#C5A258]" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--accent-secondary)' }} />
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Loading questions...</p>
      </div>
    );
  }

  const isFlagged = session.flaggedIds.includes(currentQuestion.id);
  const isBookmarked = session.bookmarkedIds.includes(currentQuestion.id);
  const progress = session.currentIndex + 1;
  const total = session.questionIds.length;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Question {progress} / {total}
          </span>
          <div className="h-1.5 w-32 rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(progress / total) * 100}%`, background: 'var(--accent-primary)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBookmark}
            className={`rounded p-1.5 transition-colors ${isBookmarked ? 'bg-yellow-900/30 text-yellow-400' : ''}`}
            style={isBookmarked ? undefined : { color: 'var(--foreground-secondary)' }}
            title="Bookmark"
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={toggleFlag}
            className={`rounded p-1.5 transition-colors ${isFlagged ? 'bg-orange-900/30 text-orange-400' : ''}`}
            style={isFlagged ? undefined : { color: 'var(--foreground-secondary)' }}
            title="Flag for review"
          >
            <Flag className="h-4 w-4" fill={isFlagged ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowScratchpad(!showScratchpad)}
            className="rounded p-1.5 transition-colors"
            style={showScratchpad ? { background: 'var(--nav-hover-bg)', color: 'var(--foreground)' } : { color: 'var(--foreground-secondary)' }}
            title="Scratchpad"
          >
            <StickyNote className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="mt-6 flex-1 space-y-6">
        <p className="text-base leading-relaxed" style={{ color: 'var(--foreground)' }}>{currentQuestion.questionText}</p>

        {/* Answer choices */}
        <div className="space-y-2">
          {currentQuestion.answerChoices.map((choice) => (
            <button
              key={choice.label}
              onClick={() => setSelectedAnswer(choice.label)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selectedAnswer === choice.label
                  ? 'border-blue-500 bg-blue-950/20'
                  : 'hover:opacity-80'
              }`}
              style={selectedAnswer === choice.label
                ? { color: 'var(--foreground)' }
                : { borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }
              }
            >
              <span className="font-medium">{choice.label}.</span> {choice.text}
            </button>
          ))}
        </div>

        {/* Scratchpad */}
        {showScratchpad && (
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
            <p className="mb-1 text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>SCRATCHPAD</p>
            <textarea
              value={scratchpad}
              onChange={(e) => updateScratchpad(e.target.value)}
              className="w-full resize-none bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--foreground)' }}
              rows={3}
              placeholder="Working notes..."
            />
          </div>
        )}
      </div>

      {/* Confidence submit buttons */}
      <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
        <p className="mb-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Select your answer above, then submit with your confidence level:</p>
        <div className="flex gap-3">
          <button
            onClick={() => submitAnswer('Guess')}
            disabled={!selectedAnswer}
            className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
          >
            Guess
          </button>
          <button
            onClick={() => submitAnswer('ThinkSo')}
            disabled={!selectedAnswer}
            className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium text-blue-300 transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ borderColor: 'var(--accent-primary)', background: 'rgba(0, 43, 92, 0.2)' }}
          >
            Think So
          </button>
          <button
            onClick={() => submitAnswer('Certain')}
            disabled={!selectedAnswer}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            Certain
          </button>
        </div>
      </div>
    </div>
  );
}
