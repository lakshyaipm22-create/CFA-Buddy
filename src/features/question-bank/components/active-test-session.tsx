'use client';

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
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
 * Initialize session and questions from localStorage.
 * This runs once synchronously so we can use the result as initial state.
 */
function loadInitialState(sessionId: string): { session: QuestionSession | null; questions: Question[] } {
  if (typeof window === 'undefined') return { session: null, questions: [] };

  const loaded = getSession(sessionId);
  if (!loaded) return { session: null, questions: [] };

  if (loaded.questionIds.length === 0) {
    const selected = selectQuestions(sampleQuestions, loaded.mode, loaded.config);
    loaded.questionIds = selected.map(q => q.id);
    saveSession(loaded);
    return { session: loaded, questions: selected };
  }

  const questions = sampleQuestions.filter(q => loaded.questionIds.includes(q.id));
  return { session: loaded, questions };
}

function getServerSnapshot(): { session: QuestionSession | null; questions: Question[] } {
  return { session: null, questions: [] };
}

export function ActiveTestSession({ sessionId }: ActiveTestSessionProps) {
  const router = useRouter();

  // Use useSyncExternalStore to safely read localStorage on client only
  const initialData = useSyncExternalStore(
    () => () => {},
    () => loadInitialState(sessionId),
    () => getServerSnapshot()
  );

  const [session, setSession] = useState<QuestionSession | null>(initialData.session);
  const [questions] = useState<Question[]>(initialData.questions);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [scratchpad, setScratchpad] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const questionStartTime = useRef(0);

  // Initialize the timer ref on mount
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, []);

  // If no session found, redirect
  if (!session && typeof window !== 'undefined') {
    router.push('/questions');
  }

  const currentQuestion = session && questions.length > 0
    ? questions.find(q => q.id === session.questionIds[session.currentIndex])
    : null;

  const submitAnswer = useCallback((confidence: Confidence) => {
    if (!session || !currentQuestion || !selectedAnswer) return;

    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);
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

    // Check if session is complete
    if (updatedSession.currentIndex >= updatedSession.questionIds.length) {
      updatedSession.status = 'completed';
      updatedSession.completedAt = new Date().toISOString();
    }

    saveSession(updatedSession);
    setSession(updatedSession);
    setSelectedAnswer(null);
    questionStartTime.current = Date.now();

    // If completed, redirect to review
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

  // Save scratchpad on change
  const updateScratchpad = useCallback((value: string) => {
    setScratchpad(value);
    if (session) {
      localStorage.setItem(`scratch-${sessionId}-${session.currentIndex}`, value);
    }
  }, [session, sessionId]);

  if (!session || !currentQuestion) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading session...</p>
      </div>
    );
  }

  const isFlagged = session.flaggedIds.includes(currentQuestion.id);
  const isBookmarked = session.bookmarkedIds.includes(currentQuestion.id);
  const progress = session.currentIndex + 1;
  const total = session.questionIds.length;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: progress + actions */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-300">
            Question {progress} / {total}
          </span>
          <div className="h-1.5 w-32 rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBookmark}
            className={`rounded p-1.5 transition-colors ${isBookmarked ? 'bg-yellow-900/30 text-yellow-400' : 'text-zinc-500 hover:text-white'}`}
            title="Bookmark"
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={toggleFlag}
            className={`rounded p-1.5 transition-colors ${isFlagged ? 'bg-orange-900/30 text-orange-400' : 'text-zinc-500 hover:text-white'}`}
            title="Flag for review"
          >
            <Flag className="h-4 w-4" fill={isFlagged ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowScratchpad(!showScratchpad)}
            className={`rounded p-1.5 transition-colors ${showScratchpad ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
            title="Scratchpad"
          >
            <StickyNote className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question content */}
      <div className="mt-6 flex-1 space-y-6">
        <p className="text-base leading-relaxed text-zinc-200">{currentQuestion.questionText}</p>

        {/* Answer choices */}
        <div className="space-y-2">
          {currentQuestion.answerChoices.map((choice) => (
            <button
              key={choice.label}
              onClick={() => setSelectedAnswer(choice.label)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selectedAnswer === choice.label
                  ? 'border-blue-500 bg-blue-950/30 text-white'
                  : 'border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <span className="font-medium">{choice.label}.</span> {choice.text}
            </button>
          ))}
        </div>

        {/* Scratchpad */}
        {showScratchpad && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
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
      <div className="mt-6 border-t border-zinc-800 pt-4">
        <p className="mb-3 text-xs text-zinc-500">Select your answer above, then submit with your confidence level:</p>
        <div className="flex gap-3">
          <button
            onClick={() => submitAnswer('Guess')}
            disabled={!selectedAnswer}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Guess ▶
          </button>
          <button
            onClick={() => submitAnswer('ThinkSo')}
            disabled={!selectedAnswer}
            className="flex-1 rounded-lg border border-blue-800 bg-blue-950/30 px-4 py-3 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Think So ▶
          </button>
          <button
            onClick={() => submitAnswer('Certain')}
            disabled={!selectedAnswer}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Certain ▶
          </button>
        </div>
      </div>
    </div>
  );
}
