'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { QuestionSession, SessionSummary, ErrorClassification } from '../types';
import { getSession, saveSession } from '../utils/session-storage';
import { buildSessionSummary } from '../utils/confidence-matrix';
import { loadAllQuestions } from '../utils/question-loader';
import { BatchFlashcardCreator } from '@/features/flashcards/components/batch-flashcard-creator';

interface SessionReviewProps {
  sessionId: string;
}

function loadReviewData(sessionId: string): { session: QuestionSession | null; summary: SessionSummary | null } {
  if (typeof window === 'undefined') return { session: null, summary: null };

  const loaded = getSession(sessionId);
  if (!loaded || loaded.status !== 'completed') return { session: null, summary: null };

  const questions = loadAllQuestions().filter(q => loaded.questionIds.includes(q.id));
  const sum = buildSessionSummary(loaded.attempts, questions.map(q => ({ id: q.id, topic: q.topic })));
  return { session: loaded, summary: sum };
}

// Score ring component
function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 70 ? 'var(--accent-success)' : score >= 50 ? 'var(--accent-secondary)' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {Math.round(score)}%
        </span>
        <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Score</span>
      </div>
    </div>
  );
}

// Mode badge
function ModeBadge({ mode }: { mode: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--accent-secondary)',
      }}
    >
      {mode}
    </span>
  );
}

// Stat card
function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs" style={{ color: 'var(--foreground-secondary)' }}>{subtitle}</p>
      )}
    </div>
  );
}

// Confidence matrix cell
function ConfidenceCell({
  label,
  count,
  total,
  bgColor,
  textColor,
}: {
  label: string;
  count: number;
  total: number;
  bgColor: string;
  textColor: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg p-3"
      style={{ backgroundColor: bgColor }}
    >
      <span className="text-2xl font-bold" style={{ color: textColor }}>{count}</span>
      <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.8 }}>{pct}%</span>
      <span className="mt-1 text-xs font-medium" style={{ color: textColor, opacity: 0.7 }}>{label}</span>
    </div>
  );
}

// Topic bar
function TopicBar({ topic, correct, total }: { topic: string; correct: number; total: number }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const barColor = pct >= 70 ? 'var(--accent-success)' : pct >= 50 ? 'var(--accent-secondary)' : '#ef4444';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--foreground)' }}>{topic}</span>
        <span className="font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          {correct}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

const ERROR_OPTIONS: { value: ErrorClassification; label: string }[] = [
  { value: 'DidntKnow', label: "Didn't Know" },
  { value: 'ForgotFormula', label: 'Forgot Formula' },
  { value: 'CalculationMistake', label: 'Calculation Mistake' },
  { value: 'MisreadQuestion', label: 'Misread Question' },
  { value: 'Careless', label: 'Careless Error' },
  { value: 'TimePressure', label: 'Time Pressure' },
];

export function SessionReview({ sessionId }: SessionReviewProps) {
  const router = useRouter();

  const [data] = useState(() => loadReviewData(sessionId));
  const { session, summary } = data;

  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealState, setRevealState] = useState<1 | 2 | 3>(1);

  // Redirect if no completed session
  useEffect(() => {
    if (!session && typeof window !== 'undefined') {
      router.push('/questions');
    }
  }, [session, router]);

  if (!session || !summary) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <p style={{ color: 'var(--foreground-secondary)' }}>Loading session...</p>
      </div>
    );
  }

  const currentAttempt = session.attempts[reviewIndex];
  const currentQuestion = loadAllQuestions().find(q => q.id === currentAttempt?.questionId);

  // Calculate confidence calibration score
  const certainAttempts = session.attempts.filter(a => a.confidence === 'Certain');
  const certainCorrect = certainAttempts.filter(a => a.correct).length;
  const confidenceScore = certainAttempts.length > 0
    ? Math.round((certainCorrect / certainAttempts.length) * 100)
    : 0;

  // Format time taken
  const totalSeconds = session.attempts.reduce((sum, a) => sum + a.timeSpentSeconds, 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeTaken = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  // Time distribution chart data
  const timeChartData = session.attempts.map((attempt, idx) => ({
    question: `Q${idx + 1}`,
    time: attempt.timeSpentSeconds,
    correct: attempt.correct,
  }));

  // Handle error classification
  const handleClassifyError = (classification: ErrorClassification) => {
    const updatedSession = { ...session };
    updatedSession.attempts = [...session.attempts];
    updatedSession.attempts[reviewIndex] = {
      ...updatedSession.attempts[reviewIndex],
      errorClassification: classification,
    };
    saveSession(updatedSession);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pb-12 md:p-6">
      {/* Results Header */}
      <div
        className="flex flex-col items-center rounded-2xl p-6 md:flex-row md:p-8"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <ScoreRing score={summary.accuracy} />
        <div className="mt-4 flex flex-col items-center md:ml-8 md:mt-0 md:items-start">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Session Complete
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ModeBadge mode={session.mode} />
            <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              {new Date(session.completedAt ?? session.startedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Time: {timeTaken}
            </span>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            {summary.accuracy >= 70
              ? 'Great job! You are performing well on this material.'
              : summary.accuracy >= 50
                ? 'Good effort. Keep reviewing the areas you missed.'
                : 'This topic needs more study. Review your weak areas below.'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Score" value={`${Math.round(summary.accuracy)}%`} />
        <StatCard
          label="Correct"
          value={`${summary.correctAnswers}/${summary.totalQuestions}`}
        />
        <StatCard
          label="Avg Time"
          value={`${Math.round(summary.averageTime)}s`}
          subtitle="per question"
        />
        <StatCard
          label="Calibration"
          value={`${confidenceScore}%`}
          subtitle="certain + correct"
        />
      </div>

      {/* Confidence Matrix */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Confidence Matrix
        </h2>
        <div className="mb-2 grid grid-cols-3 gap-1 text-center text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          <span>Certain</span>
          <span>Think So</span>
          <span>Guess</span>
        </div>
        {/* Correct Row */}
        <div className="mb-1 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          Correct
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <ConfidenceCell
            label="Mastered"
            count={summary.confidenceMatrix.mastered}
            total={summary.totalQuestions}
            bgColor="rgba(0, 132, 61, 0.15)"
            textColor="var(--accent-success)"
          />
          <ConfidenceCell
            label="Solid"
            count={summary.confidenceMatrix.solid}
            total={summary.totalQuestions}
            bgColor="rgba(59, 130, 246, 0.15)"
            textColor="#3b82f6"
          />
          <ConfidenceCell
            label="Lucky Guess"
            count={summary.confidenceMatrix.luckyGuess}
            total={summary.totalQuestions}
            bgColor="rgba(234, 179, 8, 0.15)"
            textColor="#eab308"
          />
        </div>
        {/* Incorrect Row */}
        <div className="mb-1 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
          Incorrect
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ConfidenceCell
            label="Misconception"
            count={summary.confidenceMatrix.misconception}
            total={summary.totalQuestions}
            bgColor="rgba(239, 68, 68, 0.15)"
            textColor="#ef4444"
          />
          <ConfidenceCell
            label="Weak Area"
            count={summary.confidenceMatrix.weakArea}
            total={summary.totalQuestions}
            bgColor="rgba(249, 115, 22, 0.15)"
            textColor="#f97316"
          />
          <ConfidenceCell
            label="Knowledge Gap"
            count={summary.confidenceMatrix.knowledgeGap}
            total={summary.totalQuestions}
            bgColor="rgba(107, 114, 128, 0.15)"
            textColor="#6b7280"
          />
        </div>
      </div>

      {/* Time Distribution Chart */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Time Distribution
        </h2>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="question"
                tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                label={{
                  value: 'Seconds',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--foreground-secondary)',
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                {timeChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.correct ? 'var(--accent-success)' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: 'var(--accent-success)' }} />
            Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: '#ef4444' }} />
            Incorrect
          </span>
        </div>
      </div>

      {/* Topic Breakdown */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Topic Breakdown
        </h2>
        <div className="space-y-4">
          {Object.entries(summary.byTopic).map(([topic, { correct, total }]) => (
            <TopicBar key={topic} topic={topic} correct={correct} total={total} />
          ))}
        </div>
      </div>

      {/* Question-by-Question Review */}
      {currentQuestion && currentAttempt && (
        <div
          className="rounded-2xl p-5 md:p-6"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Question Review
            </h2>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: currentAttempt.correct ? 'rgba(0, 132, 61, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: currentAttempt.correct ? 'var(--accent-success)' : '#ef4444',
              }}
            >
              {currentAttempt.correct ? 'Correct' : 'Incorrect'}
            </span>
          </div>

          {/* Question number pills */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {session.attempts.map((attempt, idx) => {
              const isActive = idx === reviewIndex;
              const bgColor = isActive
                ? 'var(--accent-primary)'
                : attempt.correct
                  ? 'rgba(0, 132, 61, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)';
              const txtColor = isActive
                ? 'var(--accent-secondary)'
                : attempt.correct
                  ? 'var(--accent-success)'
                  : '#ef4444';

              return (
                <button
                  key={idx}
                  onClick={() => { setReviewIndex(idx); setRevealState(1); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all hover:opacity-80"
                  style={{ backgroundColor: bgColor, color: txtColor }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Question text */}
          <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
            {currentQuestion.questionText}
          </p>

          {/* Confidence & time info */}
          <div className="mb-4 flex items-center gap-3 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            <span>Confidence: <strong>{currentAttempt.confidence}</strong></span>
            <span>Time: <strong>{currentAttempt.timeSpentSeconds}s</strong></span>
          </div>

          {/* Answer choices */}
          <div className="space-y-2">
            {currentQuestion.answerChoices.map((choice) => {
              const isSelected = choice.label === currentAttempt.selectedAnswer;
              const isCorrect = choice.isCorrect;
              const showCorrect = revealState >= 2;

              let borderColor = 'var(--card-border)';
              let bgColor = 'transparent';
              let textColor = 'var(--foreground-secondary)';

              if (isSelected && !showCorrect) {
                borderColor = 'var(--accent-primary)';
                bgColor = 'rgba(0, 43, 92, 0.1)';
                textColor = 'var(--foreground)';
              } else if (showCorrect && isCorrect) {
                borderColor = 'var(--accent-success)';
                bgColor = 'rgba(0, 132, 61, 0.08)';
                textColor = 'var(--accent-success)';
              } else if (showCorrect && isSelected && !isCorrect) {
                borderColor = '#ef4444';
                bgColor = 'rgba(239, 68, 68, 0.08)';
                textColor = '#ef4444';
              }

              return (
                <div
                  key={choice.label}
                  className="rounded-lg px-4 py-3 text-sm transition-all"
                  style={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">{choice.label}.</span>
                    <span>{choice.text}</span>
                    {showCorrect && isCorrect && (
                      <span className="ml-auto text-sm" style={{ color: 'var(--accent-success)' }}>&#10003;</span>
                    )}
                    {showCorrect && isSelected && !isCorrect && (
                      <span className="ml-auto text-sm" style={{ color: '#ef4444' }}>&#10007;</span>
                    )}
                  </div>
                  {revealState >= 2 && (isSelected || isCorrect) && (
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)', opacity: 0.9 }}>
                      {choice.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* State 3: Error classification (for incorrect answers) */}
          {revealState >= 3 && !currentAttempt.correct && (
            <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: 'var(--background-tertiary)', border: '1px solid var(--border)' }}>
              <p className="mb-2 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                Classify your error:
              </p>
              <div className="flex flex-wrap gap-2">
                {ERROR_OPTIONS.map((opt) => {
                  const isActive = currentAttempt.errorClassification === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleClassifyError(opt.value)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--card-bg)',
                        color: isActive ? 'var(--accent-secondary)' : 'var(--foreground-secondary)',
                        border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--card-border)'}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review flow controls */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-2">
              {revealState < 2 && (
                <button
                  onClick={() => setRevealState(2)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-secondary)',
                  }}
                >
                  Reveal Answer
                </button>
              )}
              {revealState === 2 && (
                <button
                  onClick={() => setRevealState(3)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--background-tertiary)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {currentAttempt.correct ? 'Details' : 'Classify Error'}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setReviewIndex(Math.max(0, reviewIndex - 1)); setRevealState(1); }}
                disabled={reviewIndex === 0}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
                style={{
                  backgroundColor: 'var(--background-tertiary)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                Prev
              </button>
              <button
                onClick={() => { setReviewIndex(Math.min(session.attempts.length - 1, reviewIndex + 1)); setRevealState(1); }}
                disabled={reviewIndex >= session.attempts.length - 1}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-30"
                style={{
                  backgroundColor: 'var(--background-tertiary)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Creator for incorrect answers */}
      <BatchFlashcardCreator
        incorrectQuestions={loadAllQuestions().filter(q =>
          session.attempts.some(a => a.questionId === q.id && !a.correct)
        )}
      />

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/questions"
          className="flex-1 rounded-xl px-6 py-3 text-center text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          Back to Question Bank
        </Link>
        <Link
          href="/questions"
          className="flex-1 rounded-xl px-6 py-3 text-center text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-secondary)',
          }}
        >
          Retake Test
        </Link>
      </div>
    </div>
  );
}
