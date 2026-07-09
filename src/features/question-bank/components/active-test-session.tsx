'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

  // Lazy initialization: runs only once on first render (client side)
  const [data] = useState(() => loadSessionData(sessionId));
  const [session, setSession] = useState<QuestionSession | null>(data?.session ?? null);
  const [questions] = useState<Question[]>(data?.questions ?? []);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [scratchpad, setScratchpad] = useState(() => {
    if (typeof window === 'undefined' || !data) return '';
    return localStorage.getItem(`scratch-${sessionId}-${data.session.currentIndex}`) ?? '';
  });
  const [showScratchpad, setShowScratchpad] = useState(false);
  const startTimeRef = useRef<number>(0);

  // Redirect if session not found — safe inside useEffect (not during render)
  useEffect(() => {
    if (!data) {
      router.replace('/questions');
      return;
    }
    startTimeRef.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — runs once on mount only

  const currentQuestion = (session && questions.length > 0)
    ? questions.find(q => q.id === session.questionIds[session.currentIndex]) ?? null
    : null;

  const submitAnswer = useCallback((confidence: Confidence) => {
    if (!session || !currentQuestion || !selectedAnswer) return;

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
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
    startTimeRef.current = Date.now();

    // Load scratchpad for next question
    const nextScratch = localStorage.getItem(`scratch-${sessionId}-${updatedSession.currentIndex}`);
    setScratchpad(nextScratch ?? '');

    if (updatedSession.status === 'completed') {
      router.push(`/questions/review/${sessionId}`);
    }
  }, [session, currentQuestion, selectedAnswer, sessionId, router]);

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

  // Show loading state if no session/question data available
  if (!session || !currentQuestion) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C5A258]" />
        <p className="text-xs text-zinc-500">Loading questions...</p>
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
      <div className="flex items-center justify-between border-b border-[#1a2332] pb-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-300">
            Question {progress} / {total}
          </span>
          <div className="h-1.5 w-32 rounded-full bg-[#1a2332]">
            <div
              className="h-full rounded-full bg-[#002B5C] transition-all"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleBookmark} className={`rounded p-1.5 transition-colors ${isBookmarked ? 'bg-yellow-900/30 text-yellow-400' : 'text-zinc-500 hover:text-white'}`} title="Bookmark">
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button onClick={toggleFlag} className={`rounded p-1.5 transition-colors ${isFlagged ? 'bg-orange-900/30 text-orange-400' : 'text-zinc-500 hover:text-white'}`} title="Flag for review">
            <Flag className="h-4 w-4" fill={isFlagged ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => setShowScratchpad(!showScratchpad)} className={`rounded p-1.5 transition-colors ${showScratchpad ? 'bg-[#1a2332] text-white' : 'text-zinc-500 hover:text-white'}`} title="Scratchpad">
            <StickyNote className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="mt-6 flex-1 space-y-6">
        <p className="text-base leading-relaxed text-zinc-200">{currentQuestion.questionText}</p>
        <div className="space-y-2">
          {currentQuestion.answerChoices.map((choice) => (
            <button
              key={choice.label}
              onClick={() => setSelectedAnswer(choice.label)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selectedAnswer === choice.label
                  ? 'border-[#002B5C] bg-[#002B5C]/20 text-white'
                  : 'border-[#1a2332] bg-[#0d1117] text-zinc-300 hover:border-zinc-600'
              }`}
            >
              <span className="font-medium">{choice.label}.</span> {choice.text}
            </button>
          ))}
        </div>

        {showScratchpad && (
          <div className="rounded-lg border border-[#1a2332] bg-[#0d1117] p-3">
            <p className="mb-1 text-[10px] font-medium text-zinc-500">SCRATCHPAD</p>
            <textarea
              value={scratchpad}
              onChange={(e) => updateScratchpad(e.target.value)}
              className="w-full resize-none bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none"
              rows={3}
              placeholder="Working notes..."
            />
          </div>
        )}
      </div>

      {/* Confidence submit buttons */}
      <div className="mt-6 border-t border-[#1a2332] pt-4">
        <p className="mb-3 text-xs text-zinc-500">Select an answer, then submit with confidence:</p>
        <div className="flex gap-3">
          <button onClick={() => submitAnswer('Guess')} disabled={!selectedAnswer} className="flex-1 rounded-lg border border-[#1a2332] bg-[#0d1117] px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#1a2332] disabled:cursor-not-allowed disabled:opacity-30">
            Guess ▶
          </button>
          <button onClick={() => submitAnswer('ThinkSo')} disabled={!selectedAnswer} className="flex-1 rounded-lg border border-[#002B5C] bg-[#002B5C]/20 px-4 py-3 text-sm font-medium text-blue-300 transition-colors hover:bg-[#002B5C]/40 disabled:cursor-not-allowed disabled:opacity-30">
            Think So ▶
          </button>
          <button onClick={() => submitAnswer('Certain')} disabled={!selectedAnswer} className="flex-1 rounded-lg bg-[#002B5C] px-4 py-3 text-sm font-medium text-[#C5A258] transition-colors hover:bg-[#003d7a] disabled:cursor-not-allowed disabled:opacity-30">
            Certain ▶
          </button>
        </div>
      </div>
    </div>
  );
}
