'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuestionAttempt, QuestionSession, Confidence } from '../types';
import { getSession, saveSession } from '../utils/session-storage';
import { loadAllQuestions } from '../utils/question-loader';
import { selectQuestions } from '../utils/question-selector';
import { Bookmark, Flag, StickyNote, CheckCircle2, XCircle, ArrowRight, Clock } from 'lucide-react';

interface ActiveTestSessionProps {
  sessionId: string;
}

function loadSessionData(sessionId: string): { session: QuestionSession; questions: Question[] } | null {
  if (typeof window === 'undefined') return null;
  const loaded = getSession(sessionId);
  if (!loaded) return null;

  const allQuestions = loadAllQuestions();

  if (loaded.questionIds.length === 0) {
    const selected = selectQuestions(allQuestions, loaded.mode, loaded.config);
    if (selected.length === 0) return null;
    loaded.questionIds = selected.map(q => q.id);
    saveSession(loaded);
    return { session: loaded, questions: selected };
  }

  const questions = allQuestions.filter(q => loaded.questionIds.includes(q.id));
  return { session: loaded, questions };
}

// Persist bookmarks globally (outside session scope)
function persistGlobalBookmark(questionId: string) {
  if (typeof window === 'undefined') return;
  const key = 'cfa-buddy-question-bookmarks';
  const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
  if (!existing.includes(questionId)) {
    existing.push(questionId);
    localStorage.setItem(key, JSON.stringify(existing));
  }
}

function removeGlobalBookmark(questionId: string) {
  if (typeof window === 'undefined') return;
  const key = 'cfa-buddy-question-bookmarks';
  const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
  localStorage.setItem(key, JSON.stringify(existing.filter(id => id !== questionId)));
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuestionAttempt | null>(null);
  // Live timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer: count up every second
  useEffect(() => {
    if (showFeedback) return; // Pause during feedback
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - questionStartMs) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [questionStartMs, showFeedback]);

  const currentQuestion = session && questions.length > 0
    ? questions.find(q => q.id === session.questionIds[session.currentIndex]) ?? null
    : null;

  const isTimed = session?.config.timeLimit !== null && session?.config.timeLimit !== undefined;

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
    setLastAttempt(attempt);

    if (isTimed) {
      setSession(updatedSession);
      setSelectedAnswer(null);
      setQuestionStartMs(Date.now());
      setElapsedSeconds(0);
      if (updatedSession.status === 'completed') {
        router.push(`/questions/review/${sessionId}`);
      }
    } else {
      setShowFeedback(true);
      setSession(updatedSession);
    }
  }, [session, currentQuestion, selectedAnswer, sessionId, router, questionStartMs, isTimed]);

  const advanceToNext = useCallback(() => {
    if (!session) return;
    setShowFeedback(false);
    setLastAttempt(null);
    setSelectedAnswer(null);
    setQuestionStartMs(Date.now());
    setElapsedSeconds(0);
    if (session.status === 'completed') {
      router.push(`/questions/review/${sessionId}`);
    }
  }, [session, sessionId, router]);

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
    const isCurrentlyBookmarked = session.bookmarkedIds.includes(currentQuestion.id);
    const bookmarked = isCurrentlyBookmarked
      ? session.bookmarkedIds.filter(id => id !== currentQuestion.id)
      : [...session.bookmarkedIds, currentQuestion.id];
    const updated = { ...session, bookmarkedIds: bookmarked };
    saveSession(updated);
    setSession(updated);
    // Persist globally
    if (isCurrentlyBookmarked) removeGlobalBookmark(currentQuestion.id);
    else persistGlobalBookmark(currentQuestion.id);
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
        <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--accent-secondary)' }} />
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Loading questions...</p>
      </div>
    );
  }

  const feedbackQuestion = showFeedback
    ? questions.find(q => q.id === lastAttempt?.questionId) ?? currentQuestion
    : currentQuestion;

  const isFlagged = session.flaggedIds.includes(feedbackQuestion.id);
  const isBookmarked = session.bookmarkedIds.includes(feedbackQuestion.id);
  const progress = showFeedback ? session.currentIndex : session.currentIndex + 1;
  const total = session.questionIds.length;
  const answeredCount = session.attempts.length;
  const flaggedCount = session.flaggedIds.length;

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top bar — progress + timer + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Q{Math.min(progress, total)}/{total}
          </span>
          <div className="h-2 w-24 md:w-40 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(progress / total) * 100}%`, background: 'var(--accent-primary)' }} />
          </div>
          {/* Mini stats */}
          <span className="hidden md:inline text-[10px] rounded px-1.5 py-0.5" style={{ background: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
            {answeredCount} answered{flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Live timer */}
          {!showFeedback && (
            <span className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono" style={{ background: 'var(--nav-hover-bg)', color: elapsedSeconds > 90 ? '#ef4444' : 'var(--foreground-secondary)' }}>
              <Clock className="h-3 w-3" />
              {formatTimer(elapsedSeconds)}
            </span>
          )}
          <button onClick={toggleBookmark} className={`rounded p-1.5 transition-colors ${isBookmarked ? 'bg-yellow-900/30 text-yellow-400' : ''}`} style={isBookmarked ? undefined : { color: 'var(--foreground-secondary)' }} title="Bookmark (persists after session)">
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button onClick={toggleFlag} className={`rounded p-1.5 transition-colors ${isFlagged ? 'bg-orange-900/30 text-orange-400' : ''}`} style={isFlagged ? undefined : { color: 'var(--foreground-secondary)' }} title="Flag for review">
            <Flag className="h-4 w-4" fill={isFlagged ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => setShowScratchpad(!showScratchpad)} className="rounded p-1.5 transition-colors" style={showScratchpad ? { background: 'var(--nav-hover-bg)', color: 'var(--foreground)' } : { color: 'var(--foreground-secondary)' }} title="Scratchpad">
            <StickyNote className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question body */}
      <div className="mt-4 flex-1 space-y-5 overflow-y-auto pb-4">
        <p className="text-base leading-relaxed" style={{ color: 'var(--foreground)' }}>{feedbackQuestion.questionText}</p>

        {/* Answer choices */}
        <div className="space-y-2.5">
          {feedbackQuestion.answerChoices.map((choice) => {
            const isSelected = showFeedback ? lastAttempt?.selectedAnswer === choice.label : selectedAnswer === choice.label;
            const isCorrectChoice = choice.isCorrect;
            const showCorrectHighlight = showFeedback && isCorrectChoice;
            const showIncorrectHighlight = showFeedback && isSelected && !isCorrectChoice;

            return (
              <div key={choice.label}>
                <button
                  onClick={showFeedback ? undefined : () => setSelectedAnswer(choice.label)}
                  disabled={showFeedback}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    showCorrectHighlight ? 'border-green-500 bg-green-950/20' :
                    showIncorrectHighlight ? 'border-red-500 bg-red-950/20' :
                    isSelected ? 'border-blue-500 bg-blue-950/20' :
                    'hover:opacity-80'
                  }`}
                  style={(!showFeedback && !isSelected) ? { borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' } : { color: 'var(--foreground)' }}
                >
                  <div className="flex items-start gap-2">
                    {showCorrectHighlight && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-400" />}
                    {showIncorrectHighlight && <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />}
                    <span><span className="font-medium">{choice.label}.</span> {choice.text}</span>
                  </div>
                </button>

                {showFeedback && showCorrectHighlight && (
                  <div className="mt-1.5 ml-2 rounded-lg border-l-4 border-green-500 bg-green-950/10 px-4 py-2.5">
                    <p className="text-xs font-semibold text-green-400">Correct Answer Feedback:</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>{choice.explanation}</p>
                  </div>
                )}
                {showFeedback && showIncorrectHighlight && (
                  <div className="mt-1.5 ml-2 rounded-lg border-l-4 border-red-500 bg-red-950/10 px-4 py-2.5">
                    <p className="text-xs font-semibold text-red-400">Incorrect Answer Feedback:</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>{choice.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scratchpad */}
        {showScratchpad && !showFeedback && (
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
            <p className="mb-1 text-[10px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>SCRATCHPAD</p>
            <textarea value={scratchpad} onChange={(e) => updateScratchpad(e.target.value)} className="w-full resize-none bg-transparent text-sm focus:outline-none" style={{ color: 'var(--foreground)' }} rows={3} placeholder="Working notes..." />
          </div>
        )}
      </div>

      {/* Bottom: confidence buttons OR next button */}
      {showFeedback ? (
        <div className="border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
          <button
            onClick={advanceToNext}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            {session.status === 'completed' ? 'View Results' : 'Next Question'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
          <p className="mb-2 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Submit with confidence:</p>
          <div className="flex gap-2">
            <button onClick={() => submitAnswer('Guess')} disabled={!selectedAnswer} className="flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}>
              Guess
            </button>
            <button onClick={() => submitAnswer('ThinkSo')} disabled={!selectedAnswer} className="flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium text-blue-300 transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30" style={{ borderColor: 'var(--accent-primary)', background: 'rgba(0, 43, 92, 0.2)' }}>
              Think So
            </button>
            <button onClick={() => submitAnswer('Certain')} disabled={!selectedAnswer} className="flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30" style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}>
              Certain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
