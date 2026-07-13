'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuestionAttempt, QuestionSession, Confidence } from '../types';
import { getSession, saveSession } from '../utils/session-storage';
import { loadAllQuestions } from '../utils/question-loader';
import { selectQuestions } from '../utils/question-selector';
import { Bookmark, Flag, StickyNote, CheckCircle2, XCircle, ArrowRight, Grid3X3, Star, Clock } from 'lucide-react';

interface ActiveTestSessionProps {
  sessionId: string;
}

const GLOBAL_BOOKMARKS_KEY = 'cfa-buddy-question-bookmarks';

function getGlobalBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GLOBAL_BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setGlobalBookmarks(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GLOBAL_BOOKMARKS_KEY, JSON.stringify(ids));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
  const [showGrid, setShowGrid] = useState(false);

  // Timer state
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const s = data?.session;
    if (!s || s.config.timeLimit === null || s.config.timeLimit === undefined) return null;
    const totalSeconds = s.config.timeLimit * 60;
    const sessionStartTime = new Date(s.startedAt).getTime();
    const elapsedMs = Date.now() - sessionStartTime;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    return Math.max(0, totalSeconds - elapsedSec);
  });
  const sessionCompletedRef = useRef(false);

  const currentQuestion = session && questions.length > 0
    ? questions.find(q => q.id === session.questionIds[session.currentIndex]) ?? null
    : null;

  const isTimed = session?.config.timeLimit !== null && session?.config.timeLimit !== undefined;

  // 3A: Per-question timer (counts UP)
  useEffect(() => {
    const interval = setInterval(() => {
      setQuestionElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [questionStartMs]);

  // 3A: Total countdown timer (timed sessions only)
  useEffect(() => {
    if (!isTimed) return;

    const interval = setInterval(() => {
      setTotalRemaining(prev => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimed]);

  // 3A: Auto-submit when time runs out
  useEffect(() => {
    if (totalRemaining !== 0 || !session || !isTimed || sessionCompletedRef.current) return;
    if (session.status === 'completed') return;

    sessionCompletedRef.current = true;

    // Create unanswered attempts for remaining questions
    const answeredIds = new Set(session.attempts.map(a => a.questionId));
    const remainingAttempts: QuestionAttempt[] = [];

    for (const qId of session.questionIds) {
      if (!answeredIds.has(qId)) {
        remainingAttempts.push({
          questionId: qId,
          selectedAnswer: '',
          confidence: 'Guess',
          timeSpentSeconds: 0,
          correct: false,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const updatedSession: QuestionSession = {
      ...session,
      attempts: [...session.attempts, ...remainingAttempts],
      status: 'completed',
      completedAt: new Date().toISOString(),
      currentIndex: session.questionIds.length,
    };

    saveSession(updatedSession);
    // Navigate directly without updating session state to avoid cascading renders
    router.push(`/questions/review/${sessionId}`);
  }, [totalRemaining, session, isTimed, sessionId, router]);

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
      // Timed mode: advance immediately, no feedback
      setSession(updatedSession);
      setSelectedAnswer(null);
      setQuestionElapsed(0);
      setQuestionStartMs(Date.now());
      if (updatedSession.status === 'completed') {
        router.push(`/questions/review/${sessionId}`);
      }
    } else {
      // Untimed mode: show instant feedback
      setShowFeedback(true);
      setSession(updatedSession);
    }
  }, [session, currentQuestion, selectedAnswer, sessionId, router, questionStartMs, isTimed]);

  const advanceToNext = useCallback(() => {
    if (!session) return;
    setShowFeedback(false);
    setLastAttempt(null);
    setSelectedAnswer(null);
    setQuestionElapsed(0);
    setQuestionStartMs(Date.now());
    if (session.status === 'completed') {
      router.push(`/questions/review/${sessionId}`);
    }
  }, [session, sessionId, router]);

  const toggleFlag = useCallback(() => {
    if (!session || !currentQuestion) return;
    const qId = showFeedback && lastAttempt ? lastAttempt.questionId : currentQuestion.id;
    const flagged = session.flaggedIds.includes(qId)
      ? session.flaggedIds.filter(id => id !== qId)
      : [...session.flaggedIds, qId];
    const updated = { ...session, flaggedIds: flagged };
    saveSession(updated);
    setSession(updated);
  }, [session, currentQuestion, showFeedback, lastAttempt]);

  const toggleBookmark = useCallback(() => {
    if (!session || !currentQuestion) return;
    const qId = showFeedback && lastAttempt ? lastAttempt.questionId : currentQuestion.id;
    const isCurrentlyBookmarked = session.bookmarkedIds.includes(qId);
    const bookmarked = isCurrentlyBookmarked
      ? session.bookmarkedIds.filter(id => id !== qId)
      : [...session.bookmarkedIds, qId];
    const updated = { ...session, bookmarkedIds: bookmarked };
    saveSession(updated);
    setSession(updated);

    // 3C: Also update global bookmarks
    const globalBookmarks = getGlobalBookmarks();
    if (isCurrentlyBookmarked) {
      setGlobalBookmarks(globalBookmarks.filter(id => id !== qId));
    } else {
      if (!globalBookmarks.includes(qId)) {
        setGlobalBookmarks([...globalBookmarks, qId]);
      }
    }
  }, [session, currentQuestion, showFeedback, lastAttempt]);

  // 3D: Navigate to a specific question
  const navigateToQuestion = useCallback((index: number) => {
    if (!session) return;
    if (isTimed && index < session.currentIndex) return; // No going back in timed mode
    if (showFeedback) return; // Can't navigate while showing feedback

    const updated = { ...session, currentIndex: index };
    saveSession(updated);
    setSession(updated);
    setSelectedAnswer(null);
    setQuestionElapsed(0);
    setQuestionStartMs(Date.now());
    setShowFeedback(false);
    setLastAttempt(null);
  }, [session, isTimed, showFeedback]);

  const updateScratchpad = useCallback((value: string) => {
    setScratchpad(value);
    if (session) {
      localStorage.setItem(`scratch-${sessionId}-${session.currentIndex}`, value);
    }
  }, [session, sessionId]);

  // 3E: Keyboard shortcuts
  useEffect(() => {
    if (showScratchpad) return; // Disable shortcuts when scratchpad is open

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!session || !currentQuestion) return;

      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      const feedbackQuestion = showFeedback
        ? questions.find(q => q.id === lastAttempt?.questionId) ?? currentQuestion
        : currentQuestion;

      // 1/2/3/4 or a/b/c/d to select answer
      if (!showFeedback) {
        const numMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
        const letterMap: Record<string, number> = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
        const idx = numMap[key] ?? letterMap[key] ?? -1;
        if (idx >= 0 && idx < feedbackQuestion.answerChoices.length) {
          setSelectedAnswer(feedbackQuestion.answerChoices[idx].label);
          return;
        }
      }

      // Enter to submit with default confidence
      if (key === 'enter' && selectedAnswer && !showFeedback) {
        e.preventDefault();
        submitAnswer('ThinkSo');
        return;
      }

      // F to toggle flag
      if (key === 'f') {
        toggleFlag();
        return;
      }

      // B to toggle bookmark
      if (key === 'b') {
        toggleBookmark();
        return;
      }

      // N to advance to next (only when feedback is shown)
      if (key === 'n' && showFeedback) {
        advanceToNext();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showScratchpad, session, currentQuestion, selectedAnswer, showFeedback, lastAttempt, questions, submitAnswer, toggleFlag, toggleBookmark, advanceToNext]);

  if (!session || !currentQuestion) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--accent-secondary)' }} />
        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Loading questions...</p>
      </div>
    );
  }

  // When showing feedback, show the PREVIOUS question (currentIndex already advanced)
  const feedbackQuestion = showFeedback
    ? questions.find(q => q.id === lastAttempt?.questionId) ?? currentQuestion
    : currentQuestion;

  const isFlagged = session.flaggedIds.includes(feedbackQuestion.id);
  const isBookmarked = session.bookmarkedIds.includes(feedbackQuestion.id);
  const progress = showFeedback ? session.currentIndex : session.currentIndex + 1;
  const total = session.questionIds.length;

  // 3B: Compute stats
  const answeredCount = session.attempts.length;
  const flaggedCount = session.flaggedIds.length;
  const bookmarkedCount = session.bookmarkedIds.length;

  // 3B/3D: Build question status map
  const attemptMap = new Map<string, QuestionAttempt>();
  for (const attempt of session.attempts) {
    attemptMap.set(attempt.questionId, attempt);
  }

  return (
    <div className="flex h-full flex-col">
      {/* 3B: Progress indicator */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Question {Math.min(progress, total)} of {total}
          </span>
          {/* 3A: Timers */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--foreground-secondary)' }}>
              <Clock className="h-3 w-3" />
              Q: {formatTime(questionElapsed)}
            </span>
            {isTimed && totalRemaining !== null && (
              <span className={`flex items-center gap-1 text-xs font-mono ${totalRemaining <= 60 ? 'text-red-400' : ''}`} style={totalRemaining > 60 ? { color: 'var(--accent-secondary)' } : undefined}>
                <Clock className="h-3 w-3" />
                Total: {formatTime(totalRemaining)}
              </span>
            )}
          </div>
        </div>

        {/* 3B: Progress bar with color segments */}
        <div className="mt-2 h-2 w-full rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }}>
          {session.questionIds.map((qId, idx) => {
            const attempt = attemptMap.get(qId);
            const isCurrentSegment = idx === session.currentIndex && !showFeedback;
            let bgColor: string;
            let extraClass = '';
            if (isCurrentSegment) {
              bgColor = 'var(--accent-primary)'; // blue for current question
              if (isTimed) {
                extraClass = 'animate-pulse ring-1 ring-white/50';
              }
            } else if (attempt) {
              if (isTimed) {
                bgColor = 'var(--accent-primary)'; // blue for answered in timed mode
              } else {
                bgColor = attempt.correct ? 'var(--accent-success)' : '#ef4444'; // green/red
              }
            } else {
              bgColor = 'var(--border)'; // gray for unanswered
            }
            return (
              <div
                key={`prog-${idx}`}
                className={`h-full ${extraClass}`}
                style={{
                  width: `${100 / total}%`,
                  background: bgColor,
                  ...(isCurrentSegment && isTimed ? { opacity: 1, filter: 'brightness(1.4)' } : {}),
                }}
              />
            );
          })}
        </div>

        {/* 3B: Stats line */}
        <div className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--foreground-secondary)' }}>
          <span>{answeredCount} answered</span>
          <span>·</span>
          <span>{flaggedCount} flagged</span>
          <span>·</span>
          <span>{bookmarkedCount} bookmarked</span>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={toggleBookmark} className={`rounded p-1.5 transition-colors ${isBookmarked ? 'bg-yellow-900/30 text-yellow-400' : ''}`} style={isBookmarked ? undefined : { color: 'var(--foreground-secondary)' }} title="Bookmark (B)">
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button onClick={toggleFlag} className={`rounded p-1.5 transition-colors ${isFlagged ? 'bg-orange-900/30 text-orange-400' : ''}`} style={isFlagged ? undefined : { color: 'var(--foreground-secondary)' }} title="Flag (F)">
            <Flag className="h-4 w-4" fill={isFlagged ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => setShowScratchpad(!showScratchpad)} className="rounded p-1.5 transition-colors" style={showScratchpad ? { background: 'var(--nav-hover-bg)', color: 'var(--foreground)' } : { color: 'var(--foreground-secondary)' }} title="Scratchpad">
            <StickyNote className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}>
            {feedbackQuestion.subject}
          </span>
          {feedbackQuestion.reading && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--nav-hover-bg)', color: 'var(--foreground-secondary)' }}>
              {feedbackQuestion.reading}
            </span>
          )}
        </div>
        <p className="text-base leading-relaxed" style={{ color: 'var(--foreground)' }}>{feedbackQuestion.questionText}</p>

        {/* Answer choices with feedback highlighting */}
        <div className="space-y-3">
          {feedbackQuestion.answerChoices.map((choice, choiceIdx) => {
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
                    <span>
                      <span className="font-medium">{choice.label}.</span> {choice.text}
                      {!showFeedback && (
                        <span className="ml-1 text-[10px] opacity-50">({choiceIdx + 1})</span>
                      )}
                    </span>
                  </div>
                </button>

                {/* Inline explanation feedback */}
                {showFeedback && showCorrectHighlight && (
                  <div className="mt-1 ml-2 rounded-lg border-l-4 border-green-500 bg-green-950/10 px-4 py-2">
                    <p className="text-xs font-semibold text-green-400">Correct Answer Feedback:</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      {choice.explanation}
                    </p>
                  </div>
                )}
                {showFeedback && showIncorrectHighlight && (
                  <div className="mt-1 ml-2 rounded-lg border-l-4 border-red-500 bg-red-950/10 px-4 py-2">
                    <p className="text-xs font-semibold text-red-400">Incorrect Answer Feedback:</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      {choice.explanation}
                    </p>
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

      {/* Bottom area: confidence buttons OR next button */}
      {showFeedback ? (
        <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
          <button
            onClick={advanceToNext}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}
          >
            {session.status === 'completed' ? 'View Results' : 'Next Question'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-1 text-center text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>Press N to continue</p>
        </div>
      ) : (
        <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
          <p className="mb-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>Select your answer above, then submit with your confidence level:</p>
          <div className="flex gap-3">
            <button onClick={() => submitAnswer('Guess')} disabled={!selectedAnswer} className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}>
              Guess
            </button>
            <button onClick={() => submitAnswer('ThinkSo')} disabled={!selectedAnswer} className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium text-blue-300 transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30" style={{ borderColor: 'var(--accent-primary)', background: 'rgba(0, 43, 92, 0.2)' }}>
              Think So
            </button>
            <button onClick={() => submitAnswer('Certain')} disabled={!selectedAnswer} className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30" style={{ background: 'var(--accent-primary)', color: 'var(--accent-secondary)' }}>
              Certain
            </button>
          </div>
          <p className="mt-1 text-center text-[10px]" style={{ color: 'var(--foreground-secondary)' }}>Press Enter to submit as Think So</p>
        </div>
      )}

      {/* 3D: Navigation Grid */}
      <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          <Grid3X3 className="h-3.5 w-3.5" />
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>

        {showGrid && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {session.questionIds.map((qId, idx) => {
              const attempt = attemptMap.get(qId);
              const isCurrent = showFeedback ? false : idx === session.currentIndex;
              const isAnswered = !!attempt;
              const isCorrectAnswer = attempt?.correct ?? false;
              const isQFlagged = session.flaggedIds.includes(qId);
              const isQBookmarked = session.bookmarkedIds.includes(qId);

              // Determine if clickable
              const canNavigate = !showFeedback && (isTimed ? idx >= session.currentIndex : true);

              // Color logic
              let bgStyle: string;
              let borderStyle: string;
              let textColor: string;
              if (isCurrent) {
                bgStyle = 'transparent'; // no fill for current
                borderStyle = isQFlagged ? '2px solid #f97316' : '2px solid var(--accent-primary)'; // blue ring
                textColor = 'var(--accent-primary)';
              } else if (isAnswered && !isTimed) {
                bgStyle = isCorrectAnswer ? 'var(--accent-success)' : '#ef4444'; // green/red
                borderStyle = isQFlagged ? '2px solid #f97316' : '1px solid var(--card-border)';
                textColor = '#fff';
              } else if (isAnswered && isTimed) {
                bgStyle = 'var(--accent-primary)'; // blue for answered in timed
                borderStyle = isQFlagged ? '2px solid #f97316' : '1px solid var(--card-border)';
                textColor = '#fff';
              } else {
                bgStyle = 'var(--border)'; // gray
                borderStyle = isQFlagged ? '2px solid #f97316' : '1px solid var(--card-border)';
                textColor = 'var(--foreground-secondary)';
              }

              return (
                <button
                  key={`grid-${idx}`}
                  onClick={canNavigate ? () => navigateToQuestion(idx) : undefined}
                  disabled={!canNavigate}
                  className={`relative flex items-center justify-center rounded text-[10px] font-medium transition-colors ${
                    canNavigate ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                  }`}
                  style={{
                    width: '28px',
                    height: '28px',
                    background: bgStyle,
                    color: textColor,
                    border: borderStyle,
                  }}
                  title={`Question ${idx + 1}${isQFlagged ? ' (flagged)' : ''}${isQBookmarked ? ' (bookmarked)' : ''}`}
                >
                  {idx + 1}
                  {isQBookmarked && (
                    <Star className="absolute -top-1 -right-1 h-2.5 w-2.5 text-yellow-400" fill="currentColor" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
