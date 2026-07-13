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
import {
  Check,
  X,
  Star,
  Flag,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Download,
} from 'lucide-react';
import type { Question, QuestionSession, SessionSummary, ErrorClassification } from '../types';
import { getSession, getSessions, saveSession } from '../utils/session-storage';
import { buildSessionSummary } from '../utils/confidence-matrix';
import { loadAllQuestions } from '../utils/question-loader';
import { BatchFlashcardCreator } from '@/features/flashcards/components/batch-flashcard-creator';

interface SessionReviewProps {
  sessionId: string;
}

function loadReviewData(sessionId: string): { session: QuestionSession | null; summary: SessionSummary | null; questions: Question[] } {
  if (typeof window === 'undefined') return { session: null, summary: null, questions: [] };

  const loaded = getSession(sessionId);
  if (!loaded || loaded.status !== 'completed') return { session: null, summary: null, questions: [] };

  const allQ = loadAllQuestions();
  const questions = allQ.filter(q => loaded.questionIds.includes(q.id));
  const sum = buildSessionSummary(loaded.attempts, questions.map(q => ({ id: q.id, topic: q.topic })));
  return { session: loaded, summary: sum, questions };
}

function loadSessionHistory(): { scores: number[]; trend: 'up' | 'down' | 'flat' } {
  if (typeof window === 'undefined') return { scores: [], trend: 'flat' };

  const sessions = getSessions().filter(s => s.status === 'completed' && s.completedAt);
  if (sessions.length === 0) return { scores: [], trend: 'flat' };

  const sorted = sessions
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

  const last5 = sorted.slice(-5);
  const scores = last5.map(s => {
    const correct = s.attempts.filter(a => a.correct).length;
    return s.attempts.length > 0 ? Math.round((correct / s.attempts.length) * 100) : 0;
  });

  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (scores.length >= 2) {
    const first = scores[0];
    const last = scores[scores.length - 1];
    if (last - first > 3) trend = 'up';
    else if (first - last > 3) trend = 'down';
  }

  return { scores, trend };
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
  const { session, summary, questions: sessionQuestions } = data;

  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealState, setRevealState] = useState<1 | 2 | 3>(1);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);
  const [sessionHistory] = useState(() => loadSessionHistory());

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
  const currentQuestion = sessionQuestions.find(q => q.id === currentAttempt?.questionId);

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
      {/* Session History Comparison */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        {sessionHistory.scores.length <= 1 ? (
          <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
            First session completed!
          </p>
        ) : (
          <>
            <span className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>
              Your recent scores:
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {sessionHistory.scores.map((s, i) => {
                const isLast = i === sessionHistory.scores.length - 1;
                return isLast ? `${s}% (this session)` : `${s}%`;
              }).join(' \u2192 ')}
            </span>
            {sessionHistory.trend === 'up' && (
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent-success)' }} />
            )}
            {sessionHistory.trend === 'down' && (
              <TrendingDown className="h-4 w-4" style={{ color: '#ef4444' }} />
            )}
            {sessionHistory.trend === 'flat' && (
              <Minus className="h-4 w-4" style={{ color: 'var(--accent-secondary)' }} />
            )}
          </>
        )}
      </div>
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

      {/* Subject Performance Table */}
      {(() => {
        const bySubject: Record<string, { correct: number; total: number; totalTime: number }> = {};
        session.attempts.forEach(attempt => {
          const q = sessionQuestions.find(qq => qq.id === attempt.questionId);
          const subj = q?.subject ?? 'Unknown';
          if (!bySubject[subj]) bySubject[subj] = { correct: 0, total: 0, totalTime: 0 };
          bySubject[subj].total += 1;
          bySubject[subj].totalTime += attempt.timeSpentSeconds;
          if (attempt.correct) bySubject[subj].correct += 1;
        });
        const sorted = Object.entries(bySubject).sort((a, b) => {
          const accA = a[1].total > 0 ? (a[1].correct / a[1].total) * 100 : 0;
          const accB = b[1].total > 0 ? (b[1].correct / b[1].total) * 100 : 0;
          return accA - accB;
        });

        return (
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Subject Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--foreground-secondary)' }}>
                    <th className="pb-2 text-left font-medium">Subject</th>
                    <th className="pb-2 text-center font-medium">Questions</th>
                    <th className="pb-2 text-center font-medium">Correct</th>
                    <th className="pb-2 text-center font-medium">Accuracy</th>
                    <th className="pb-2 text-center font-medium">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(([subj, stats]) => {
                    const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    const avgTime = stats.total > 0 ? Math.round(stats.totalTime / stats.total) : 0;
                    const accColor = acc >= 70 ? 'var(--accent-success)' : acc >= 50 ? 'var(--accent-secondary)' : '#ef4444';
                    return (
                      <tr key={subj} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 text-left" style={{ color: 'var(--foreground)' }}>{subj}</td>
                        <td className="py-2 text-center" style={{ color: 'var(--foreground-secondary)' }}>{stats.total}</td>
                        <td className="py-2 text-center" style={{ color: 'var(--foreground-secondary)' }}>{stats.correct}</td>
                        <td className="py-2 text-center font-semibold" style={{ color: accColor }}>{acc}%</td>
                        <td className="py-2 text-center" style={{ color: 'var(--foreground-secondary)' }}>{avgTime}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Time Traps */}
      {(() => {
        const timeTraps = session.attempts
          .map((attempt, idx) => ({ attempt, idx, question: sessionQuestions.find(q => q.id === attempt.questionId) }))
          .filter(item => item.attempt.timeSpentSeconds > 90);

        return (
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <h2 className="mb-1 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Time Traps
            </h2>
            <p className="mb-4 text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Questions where you spent more than 90 seconds
            </p>
            {timeTraps.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--accent-success)' }}>
                No time traps! You maintained good pacing.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {timeTraps.map(({ attempt, idx, question }) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: 'var(--background-tertiary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                        Q{idx + 1}
                      </span>
                      <span className="flex-1 truncate text-sm" style={{ color: 'var(--foreground)' }}>
                        {question?.questionText.slice(0, 60)}{(question?.questionText.length ?? 0) > 60 ? '...' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                        <Clock className="h-3 w-3" />
                        {attempt.timeSpentSeconds}s
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: attempt.correct ? 'rgba(0, 132, 61, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: attempt.correct ? 'var(--accent-success)' : '#ef4444',
                        }}
                      >
                        {attempt.correct ? 'Correct' : 'Wrong'}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-4 flex items-start gap-2 rounded-lg p-3"
                  style={{
                    backgroundColor: 'rgba(197, 162, 88, 0.08)',
                    border: '1px solid var(--accent-secondary)',
                  }}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-secondary)' }} />
                  <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    Questions taking &gt;90s often indicate uncertainty. Review these concepts.
                  </p>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* All Questions - Scrollable List */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          All Questions
        </h2>
        <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
          {session.attempts.map((attempt, idx) => {
            const question = sessionQuestions.find(q => q.id === attempt.questionId);
            if (!question) return null;
            const isExpanded = expandedQuestionIdx === idx;
            const isBookmarked = session.bookmarkedIds.includes(attempt.questionId);
            const isFlagged = session.flaggedIds.includes(attempt.questionId);

            const confidenceColor = attempt.confidence === 'Certain'
              ? 'var(--accent-success)'
              : attempt.confidence === 'ThinkSo'
                ? '#3b82f6'
                : '#6b7280';
            const confidenceBg = attempt.confidence === 'Certain'
              ? 'rgba(0, 132, 61, 0.15)'
              : attempt.confidence === 'ThinkSo'
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(107, 114, 128, 0.15)';

            return (
              <div key={idx}>
                <button
                  onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all hover:opacity-90"
                  style={{
                    backgroundColor: attempt.correct
                      ? 'rgba(0, 132, 61, 0.06)'
                      : 'rgba(239, 68, 68, 0.06)',
                    border: `1px solid ${attempt.correct ? 'rgba(0, 132, 61, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  }}
                >
                  <span className="w-7 flex-shrink-0 text-xs font-semibold" style={{ color: 'var(--foreground-secondary)' }}>
                    #{idx + 1}
                  </span>
                  <span className="flex-1 truncate text-sm" style={{ color: 'var(--foreground)' }}>
                    {question.questionText.slice(0, 80)}{question.questionText.length > 80 ? '...' : ''}
                  </span>
                  {isBookmarked && <Star className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--accent-secondary)' }} />}
                  {isFlagged && <Flag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#f97316' }} />}
                  <span className="w-6 text-center text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>
                    {attempt.selectedAnswer}
                  </span>
                  <span className="w-6 text-center text-xs font-medium" style={{ color: 'var(--accent-success)' }}>
                    {question.answerChoices.find(c => c.isCorrect)?.label ?? '?'}
                  </span>
                  {attempt.correct ? (
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-success)' }} />
                  ) : (
                    <X className="h-4 w-4 flex-shrink-0" style={{ color: '#ef4444' }} />
                  )}
                  <span className="w-10 text-right text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    {attempt.timeSpentSeconds}s
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: confidenceBg, color: confidenceColor }}
                  >
                    {attempt.confidence === 'ThinkSo' ? 'Think So' : attempt.confidence}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--foreground-secondary)' }} />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--foreground-secondary)' }} />
                  )}
                </button>
                {isExpanded && (
                  <div
                    className="ml-4 mt-1 mb-2 rounded-lg p-4"
                    style={{
                      backgroundColor: 'var(--background-tertiary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      {question.questionText}
                    </p>
                    <div className="space-y-2">
                      {question.answerChoices.map((choice) => {
                        const isCorrectChoice = choice.isCorrect;
                        const isUserPick = choice.label === attempt.selectedAnswer;
                        let choiceBg = 'transparent';
                        let choiceBorder = 'var(--border)';
                        let choiceColor = 'var(--foreground-secondary)';

                        if (isCorrectChoice) {
                          choiceBg = 'rgba(0, 132, 61, 0.08)';
                          choiceBorder = 'var(--accent-success)';
                          choiceColor = 'var(--accent-success)';
                        } else if (isUserPick && !isCorrectChoice) {
                          choiceBg = 'rgba(239, 68, 68, 0.08)';
                          choiceBorder = '#ef4444';
                          choiceColor = '#ef4444';
                        }

                        return (
                          <div
                            key={choice.label}
                            className="rounded-md px-3 py-2 text-sm"
                            style={{
                              backgroundColor: choiceBg,
                              border: `1px solid ${choiceBorder}`,
                              color: choiceColor,
                            }}
                          >
                            <span className="font-semibold">{choice.label}.</span> {choice.text}
                            {isCorrectChoice && <span className="ml-2">&#10003;</span>}
                            {isUserPick && !isCorrectChoice && <span className="ml-2">&#10007;</span>}
                          </div>
                        );
                      })}
                    </div>
                    {/* Explanation for correct answer */}
                    {(() => {
                      const correctChoice = question.answerChoices.find(c => c.isCorrect);
                      return correctChoice?.explanation ? (
                        <div className="mt-3 rounded-md p-3" style={{ backgroundColor: 'rgba(0, 132, 61, 0.05)', border: '1px solid rgba(0, 132, 61, 0.15)' }}>
                          <p className="text-xs font-medium" style={{ color: 'var(--accent-success)' }}>Explanation</p>
                          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                            {correctChoice.explanation}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            );
          })}
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
      {(() => {
        const incorrectQuestions = sessionQuestions.filter(q =>
          session.attempts.some(a => a.questionId === q.id && !a.correct)
        );
        return incorrectQuestions.length > 0 ? (
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Create Flashcards from Wrong Answers ({incorrectQuestions.length} questions)
            </p>
            <BatchFlashcardCreator incorrectQuestions={incorrectQuestions} />
          </div>
        ) : null;
      })()}

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
        <button
          onClick={() => {
            const csvRows: string[] = [];
            csvRows.push('Question#,QuestionText,YourAnswer,CorrectAnswer,Correct(Y/N),Confidence,TimeSpent,Subject');
            session.attempts.forEach((attempt, idx) => {
              const question = sessionQuestions.find(q => q.id === attempt.questionId);
              const questionText = question
                ? '"' + question.questionText.replace(/"/g, '""') + '"'
                : '';
              const correctChoice = question
                ? question.answerChoices.find(c => c.isCorrect)?.label ?? ''
                : '';
              const subject = question ? '"' + question.subject.replace(/"/g, '""') + '"' : '';
              csvRows.push(
                [
                  idx + 1,
                  questionText,
                  attempt.selectedAnswer,
                  correctChoice,
                  attempt.correct ? 'Y' : 'N',
                  attempt.confidence,
                  attempt.timeSpentSeconds + 's',
                  subject,
                ].join(',')
              );
            });
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const dateStr = session.completedAt
              ? new Date(session.completedAt).toISOString().slice(0, 10)
              : new Date(session.startedAt).toISOString().slice(0, 10);
            const scoreVal = Math.round(summary.accuracy);
            const filename = `CFA-Buddy-Session-${dateStr}-${scoreVal}%.csv`;
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-center text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          <Download className="h-4 w-4" />
          Export Results
        </button>
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
