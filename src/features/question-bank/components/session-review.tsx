'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { QuestionSession, SessionSummary } from '../types';
import { getSession } from '../utils/session-storage';
import { buildSessionSummary } from '../utils/confidence-matrix';
import { sampleQuestions } from '../data/sample-questions';

interface SessionReviewProps {
  sessionId: string;
}

function loadReviewData(sessionId: string): { session: QuestionSession | null; summary: SessionSummary | null } {
  if (typeof window === 'undefined') return { session: null, summary: null };

  const loaded = getSession(sessionId);
  if (!loaded || loaded.status !== 'completed') return { session: null, summary: null };

  const questions = sampleQuestions.filter(q => loaded.questionIds.includes(q.id));
  const sum = buildSessionSummary(loaded.attempts, questions.map(q => ({ id: q.id, topic: q.topic })));
  return { session: loaded, summary: sum };
}

function getServerSnapshot(): { session: QuestionSession | null; summary: SessionSummary | null } {
  return { session: null, summary: null };
}

export function SessionReview({ sessionId }: SessionReviewProps) {
  const router = useRouter();

  const { session, summary } = useSyncExternalStore(
    () => () => {},
    () => loadReviewData(sessionId),
    () => getServerSnapshot()
  );

  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealState, setRevealState] = useState<1 | 2 | 3>(1);

  // If no completed session, redirect
  if (!session && typeof window !== 'undefined') {
    router.push('/questions');
  }

  if (!session || !summary) {
    return <div className="flex h-full items-center justify-center"><p className="text-zinc-400">Loading...</p></div>;
  }

  const currentAttempt = session.attempts[reviewIndex];
  const currentQuestion = sampleQuestions.find(q => q.id === currentAttempt?.questionId);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Score" value={`${Math.round(summary.accuracy)}%`} />
        <StatCard label="Correct" value={`${summary.correctAnswers}/${summary.totalQuestions}`} />
        <StatCard label="Avg Time" value={`${Math.round(summary.averageTime)}s`} />
        <StatCard label="Confidence" value={formatMatrix(summary.confidenceMatrix)} />
      </div>

      {/* Confidence Matrix */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-300">Confidence Matrix</h3>
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
          <MatrixCell label="Mastered" count={summary.confidenceMatrix.mastered} color="text-green-400" />
          <MatrixCell label="Solid" count={summary.confidenceMatrix.solid} color="text-blue-400" />
          <MatrixCell label="Lucky Guess" count={summary.confidenceMatrix.luckyGuess} color="text-yellow-400" />
          <MatrixCell label="Misconception" count={summary.confidenceMatrix.misconception} color="text-red-400" />
          <MatrixCell label="Weak Area" count={summary.confidenceMatrix.weakArea} color="text-orange-400" />
          <MatrixCell label="Knowledge Gap" count={summary.confidenceMatrix.knowledgeGap} color="text-zinc-400" />
        </div>
      </div>

      {/* Question-by-question review */}
      {currentQuestion && currentAttempt && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Review {reviewIndex + 1}/{session.attempts.length}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${currentAttempt.correct ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {currentAttempt.correct ? 'Correct' : 'Incorrect'}
            </span>
          </div>

          {/* State 1: Your answer */}
          <p className="mb-4 text-sm text-zinc-200">{currentQuestion.questionText}</p>

          <div className="space-y-2">
            {currentQuestion.answerChoices.map((choice) => {
              const isSelected = choice.label === currentAttempt.selectedAnswer;
              const isCorrect = choice.isCorrect;
              const showCorrect = revealState >= 2;

              return (
                <div
                  key={choice.label}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    isSelected && !showCorrect
                      ? 'border-blue-500 bg-blue-950/30 text-white'
                      : showCorrect && isCorrect
                        ? 'border-green-500 bg-green-950/20 text-green-300'
                        : showCorrect && isSelected && !isCorrect
                          ? 'border-red-500 bg-red-950/20 text-red-300'
                          : 'border-zinc-700 text-zinc-400'
                  }`}
                >
                  <span className="font-medium">{choice.label}.</span> {choice.text}
                  {showCorrect && isCorrect && <span className="ml-2 text-green-400">✓</span>}
                  {showCorrect && isSelected && !isCorrect && <span className="ml-2 text-red-400">✗</span>}
                  {revealState >= 2 && (isSelected || isCorrect) && (
                    <p className="mt-2 text-xs text-zinc-500">{choice.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Review flow controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              {revealState < 2 && (
                <button onClick={() => setRevealState(2)} className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700">
                  Reveal Answer
                </button>
              )}
              {revealState < 3 && revealState >= 2 && (
                <button onClick={() => setRevealState(3)} className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700">
                  Actions
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setReviewIndex(Math.max(0, reviewIndex - 1)); setRevealState(1); }}
                disabled={reviewIndex === 0}
                className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                onClick={() => { setReviewIndex(Math.min(session.attempts.length - 1, reviewIndex + 1)); setRevealState(1); }}
                disabled={reviewIndex >= session.attempts.length - 1}
                className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/questions" className="inline-block text-sm text-blue-400 hover:text-blue-300">
        ← Back to Question Bank
      </Link>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function MatrixCell({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded bg-zinc-800/50 px-3 py-2">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-medium ${color}`}>{count}</span>
    </div>
  );
}

function formatMatrix(matrix: { mastered: number; solid: number; luckyGuess: number; misconception: number; weakArea: number; knowledgeGap: number }): string {
  const correct = matrix.mastered + matrix.solid + matrix.luckyGuess;
  const total = correct + matrix.misconception + matrix.weakArea + matrix.knowledgeGap;
  if (total === 0) return '—';
  return `${matrix.mastered}M ${matrix.misconception}X`;
}
